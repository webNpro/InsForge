import { ColumnType } from '@insforge/shared-schemas';

export const convertSqlTypeToColumnType = (sqlType: string): ColumnType | string => {
  switch (sqlType.toLowerCase()) {
    case 'uuid':
      return ColumnType.UUID;
    case 'timestamptz':
    case 'timestamp with time zone':
      return ColumnType.DATETIME;
    case 'date':
      return ColumnType.DATE;
    case 'integer':
    case 'bigint':
    case 'smallint':
    case 'int':
    case 'int2':
    case 'int4':
    case 'serial':
    case 'serial2':
    case 'serial4':
    case 'serial8':
    case 'smallserial':
    case 'bigserial':
      return ColumnType.INTEGER;
    case 'double precision':
    case 'real':
    case 'numeric':
    case 'float':
    case 'float4':
    case 'float8':
    case 'decimal':
      return ColumnType.FLOAT;
    case 'boolean':
    case 'bool':
      return ColumnType.BOOLEAN;
    case 'json':
    case 'jsonb':
    case 'array':
      return ColumnType.JSON;
    case 'text':
    case 'varchar':
    case 'char':
    case 'character varying':
    case 'character':
      return ColumnType.STRING;
    default:
      return sqlType.slice(0, 5);
  }
};
