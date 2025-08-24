import { HardDrive } from 'lucide-react';
import { BucketMetadataSchema } from '@insforge/shared-schemas';

interface BucketNodeProps {
  data: {
    bucket: BucketMetadataSchema;
  };
}

export function BucketNode({ data }: BucketNodeProps) {
  const { bucket } = data;

  return (
    <div className="bg-neutral-900 rounded-lg border border-[#363636] min-w-[320px]">
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
        {/* <div className="p-1.5">
          <ExternalLink className="w-4 h-4 text-neutral-400" />
        </div> */}
      </div>
    </div>
  );
}
