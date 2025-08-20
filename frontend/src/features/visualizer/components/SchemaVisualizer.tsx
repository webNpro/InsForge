import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionMode,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TableNode } from './TableNode';
import { AuthNode } from './AuthNode';
import { BucketNode } from './BucketNode';
import { AppMetadataSchema } from '@insforge/shared-schemas';

interface SchemaVisualizerProps {
  metadata: AppMetadataSchema;
  userCount?: number;
}

const nodeTypes = {
  tableNode: TableNode,
  authNode: AuthNode,
  bucketNode: BucketNode,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  // Fixed dimensions
  const nodeWidth = 280;

  // Calculate actual node heights based on content
  const calculateNodeHeight = (node: Node) => {
    if (node.type === 'authNode') {
      // Auth node has fixed content
      return 150;
    } else if (node.type === 'tableNode') {
      // Table node height depends on columns
      const table = node.data.table;
      const columnCount = table.columns.length || 0;
      const headerHeight = 64; // Header with table name
      const columnHeight = 48; // Each column row height
      const contentHeight = columnCount > 0 ? columnCount * columnHeight : 100; // Empty state height
      return headerHeight + contentHeight;
    } else if (node.type === 'bucketNode') {
      // Bucket node has relatively fixed height
      return 200;
    }
    return 200; // Default
  };

  // Layout parameters
  const horizontalGap = 100; // Gap between columns
  const verticalGap = 80; // Gap between nodes in same column
  const canvasMargin = 50;

  // Group nodes by type
  const authNodes = nodes.filter((node) => node.type === 'authNode');
  const tableNodes = nodes.filter((node) => node.type === 'tableNode');
  const bucketNodes = nodes.filter((node) => node.type === 'bucketNode');

  // Calculate column X positions
  const authX = canvasMargin;
  const tableStartX = authX + nodeWidth + horizontalGap * 2;
  const bucketX =
    tableStartX +
    Math.ceil(Math.sqrt(tableNodes.length)) * (nodeWidth + horizontalGap) +
    horizontalGap;

  // Helper function to distribute nodes vertically with dynamic heights
  const distributeVerticallyDynamic = (nodesToPosition: Node[], startY: number = canvasMargin) => {
    const positions: number[] = [];
    let currentY = startY;

    nodesToPosition.forEach((node) => {
      positions.push(currentY);
      const nodeHeight = calculateNodeHeight(node);
      currentY += nodeHeight + verticalGap;
    });

    return positions;
  };

  // Position auth nodes in left column
  const authYPositions = distributeVerticallyDynamic(authNodes);
  const positionedAuthNodes = authNodes.map((node, index) => ({
    ...node,
    position: {
      x: authX,
      y: authYPositions[index],
    },
  }));

  // Position table nodes in a grid in the middle
  let positionedTableNodes: Node[] = [];
  if (tableNodes.length > 0) {
    const cols = Math.ceil(Math.sqrt(tableNodes.length));

    // Group tables by column for better height calculation
    const tablesByColumn: Node[][] = [];
    for (let col = 0; col < cols; col++) {
      tablesByColumn[col] = [];
    }

    tableNodes.forEach((node, index) => {
      const col = index % cols;
      tablesByColumn[col].push(node);
    });

    // Calculate Y positions for each column independently
    const columnYPositions: number[][] = tablesByColumn.map((columnNodes) =>
      distributeVerticallyDynamic(columnNodes)
    );

    positionedTableNodes = tableNodes.map((node, index) => {
      const col = index % cols;
      const rowInColumn = Math.floor(index / cols);

      return {
        ...node,
        position: {
          x: tableStartX + col * (nodeWidth + horizontalGap),
          y: columnYPositions[col][rowInColumn],
        },
      };
    });
  }

  // Position bucket nodes in right column
  const bucketYPositions = distributeVerticallyDynamic(bucketNodes);
  const positionedBucketNodes = bucketNodes.map((node, index) => ({
    ...node,
    position: {
      x: bucketX,
      y: bucketYPositions[index],
    },
  }));

  // Combine all positioned nodes
  const layoutedNodes = [...positionedAuthNodes, ...positionedTableNodes, ...positionedBucketNodes];

  return { nodes: layoutedNodes, edges };
};

export function SchemaVisualizer({ metadata, userCount }: SchemaVisualizerProps) {
  const initialNodes = useMemo(() => {
    const tableNodes: Node[] = metadata.database.tables.map((table, _) => ({
      id: table.tableName,
      type: 'tableNode',
      position: { x: 0, y: 0 },
      data: { table },
    }));

    const bucketNodes: Node[] = metadata.storage.buckets.map((bucket) => ({
      id: `bucket-${bucket.name}`,
      type: 'bucketNode',
      position: { x: 0, y: 0 },
      data: { bucket },
    }));

    const nodes: Node[] = [...tableNodes, ...bucketNodes];

    // Add authentication node if authData is provided
    nodes.push({
      id: 'authentication',
      type: 'authNode',
      position: { x: 0, y: 0 },
      data: {
        authMetadata: metadata.auth,
        userCount,
      },
    });

    return nodes;
  }, [metadata, userCount]);

  const initialEdges = useMemo(() => {
    const edges: Edge[] = [];

    metadata.database.tables.forEach((table) => {
      table.columns.forEach((column) => {
        if (column.foreignKey) {
          const edgeId = `${table.tableName}-${column.columnName}-${column.foreignKey.referenceTable}`;
          edges.push({
            id: edgeId,
            source: table.tableName,
            target: column.foreignKey.referenceTable,
            sourceHandle: null,
            targetHandle: null,
            type: 'smoothstep',
            animated: true,
            label: column.columnName,
            labelStyle: { fontSize: 10, fontWeight: 500 },
            labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
            style: { stroke: '#3B82F6', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#3B82F6',
            },
          });
        }
      });
    });

    // Add authentication edges if authData exists

    metadata.database.tables.forEach((table) => {
      // Check for user_id columns that reference the user table
      const userColumns = table.columns.filter(
        (column) =>
          column.columnName.toLowerCase().includes('user') ||
          (column.foreignKey && column.foreignKey.referenceTable === 'user')
      );

      if (userColumns.length > 0) {
        const edgeId = `authentication-${table.tableName}`;
        edges.push({
          id: edgeId,
          source: 'authentication',
          target: table.tableName,
          sourceHandle: null,
          targetHandle: null,
          type: 'smoothstep',
          animated: true,
          label: 'authenticates',
          labelStyle: { fontSize: 10, fontWeight: 500 },
          labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
          style: { stroke: '#10B981', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#10B981',
          },
        });
      }
    });

    return edges;
  }, [metadata]);

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(initialNodes, initialEdges),
    [initialNodes, initialEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Controls showInteractive={false} className="!bg-white !border-gray-200 !shadow-md" />
        <MiniMap
          nodeColor={() => '#3B82F6'}
          className="!bg-white !border-gray-200 !shadow-md"
          maskColor="rgb(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}
