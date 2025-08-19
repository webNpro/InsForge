import { Handle, Position } from 'reactflow';
import { Database, ExternalLink, Circle } from 'lucide-react';
import { ColumnSchema, TableSchema } from '@insforge/shared-schemas';

interface TableNodeProps {
  data: {
    table: TableSchema;
  };
}

export function TableNode({ data }: TableNodeProps) {
  const { table } = data;

  const primaryKeys = table.columns.filter((col) => col.isPrimaryKey);
  const foreignKeys = table.columns.filter((col) => col.foreignKey);
  const regularColumns = table.columns.filter((col) => !col.isPrimaryKey && !col.foreignKey);
  const allColumns = [...primaryKeys, ...foreignKeys, ...regularColumns];

  const getColumnIcon = (column: ColumnSchema) => {
    if (column.isPrimaryKey) {
      return <div className="w-5 h-5 bg-neutral-700 rounded" />;
    }
    if (column.foreignKey) {
      return (
        <div className="w-5 h-5 flex items-center justify-center">
          <div className="w-2 h-2 bg-teal-300 rounded-full" />
          <div className="w-2 h-2 bg-teal-300 rounded-full -ml-1" />
        </div>
      );
    }
    return <div className="w-5 h-5 bg-neutral-700 rounded" />;
  };

  return (
    <div className="bg-neutral-900 rounded-lg border border-[#363636] min-w-[320px]">
      <Handle type="target" position={Position.Left} className="!bg-teal-300" />

      {/* Table Header */}
      <div className="flex items-center justify-between p-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-11 h-11 bg-teal-300 rounded p-1.5">
            <Database className="w-5 h-5 text-neutral-900" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-white">{table.tableName}</h3>
            <p className="text-xs text-neutral-300">
              {table.recordCount !== undefined
                ? `${table.recordCount.toLocaleString()} data`
                : '0 data'}
            </p>
          </div>
        </div>
        <div className="p-1.5">
          <ExternalLink className="w-4 h-4 text-neutral-400" />
        </div>
      </div>

      {/* Columns */}
      <div>
        {allColumns.map((column) => (
          <div
            key={column.columnName}
            className="flex items-center justify-between p-3 border-b border-neutral-800"
          >
            <div className="flex items-center gap-2.5 flex-1">
              {getColumnIcon(column)}
              <span className="text-sm text-neutral-300">{column.columnName}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="px-1.5 py-0.5 bg-neutral-800 rounded flex items-center">
                <span className="text-xs font-medium text-neutral-300">{column.type}</span>
              </div>
              <Circle className="w-5 h-5 text-neutral-600 fill-neutral-600" />
            </div>
          </div>
        ))}

        {/* Empty state */}
        {allColumns.length === 0 && (
          <div className="flex items-center justify-center p-6">
            <div className="text-center">
              <Database className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
              <p className="text-xs text-neutral-500">No columns defined</p>
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-teal-300" />
    </div>
  );
}
