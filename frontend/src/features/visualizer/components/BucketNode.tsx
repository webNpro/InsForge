import { Handle, Position } from 'reactflow';
import { HardDrive, ExternalLink, Circle } from 'lucide-react';
import { BucketMetadataSchema } from '@insforge/shared-schemas';

interface BucketNodeProps {
  data: {
    bucket: BucketMetadataSchema;
  };
}

export function BucketNode({ data }: BucketNodeProps) {
  const { bucket } = data;

  const fields = [
    { name: 'Name', type: 'string' },
    { name: 'Size', type: 'int' },
    { name: 'Type', type: 'string' },
    { name: 'Uploaded', type: 'timestamp' },
  ];

  return (
    <div className="bg-neutral-900 rounded-lg border border-[#363636] min-w-[320px]">
      <Handle type="target" position={Position.Left} className="!bg-blue-300" />

      {/* Bucket Header */}
      <div className="flex items-center justify-between p-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-11 h-11 bg-blue-300 rounded p-1.5">
            <HardDrive className="w-5 h-5 text-neutral-900" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-white">{bucket.name}</h3>
            <p className="text-xs text-neutral-300">
              {bucket.objectCount ? `${bucket.objectCount} files` : '0 files'}
            </p>
          </div>
        </div>
        <div className="p-1.5">
          <ExternalLink className="w-4 h-4 text-neutral-400" />
        </div>
      </div>

      {/* Fields */}
      <div className="max-h-[400px] overflow-y-auto">
        {fields.map((field) => (
          <div
            key={field.name}
            className="flex items-center justify-between p-3 border-b border-neutral-800"
          >
            <div className="flex items-center gap-2.5 flex-1">
              <div className="w-5 h-5 bg-neutral-700 rounded" />
              <span className="text-sm text-neutral-300">{field.name}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="px-1.5 py-0.5 bg-neutral-800 rounded flex items-center">
                <span className="text-xs font-medium text-neutral-300">{field.type}</span>
              </div>
              <Circle className="w-5 h-5 text-neutral-600 fill-neutral-600" />
            </div>
          </div>
        ))}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-blue-300" />
    </div>
  );
}
