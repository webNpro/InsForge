import { z } from 'zod';
import { columnSchema, foreignKeySchema, tableSchema } from './database.schema';

export const createTableRequestSchema = tableSchema
  .pick({
    tableName: true,
    columns: true,
  })
  .extend({
    rlsEnabled: z.boolean().default(true),
  });

export const createTableResponseSchema = tableSchema
  .pick({
    tableName: true,
    columns: true,
  })
  .extend({
    message: z.string(),
    autoFields: z.array(z.string()),
    nextActions: z.string(),
  });

export const getTableSchemaResponseSchema = tableSchema;

export const updateTableSchemaRequestSchema = z.object({
  addColumns: z
    .array(
      columnSchema.omit({
        foreignKey: true,
      })
    )
    .optional(),
  dropColumns: z.array(z.string()).optional(),
  updateColumns: z
    .array(
      z.object({
        columnName: z.string(),
        defaultValue: z.string().optional(),
        newColumnName: z
          .string()
          .min(1, 'New column name cannot be empty')
          .max(64, 'New column name must be less than 64 characters')
          .optional(),
      })
    )
    .optional(),
  addForeignKeys: z
    .array(
      z.object({
        columnName: z.string().min(1, 'Column name is required for adding foreign key'),
        foreignKey: foreignKeySchema,
      })
    )
    .optional(),
  dropForeignKeys: z.array(z.string()).optional(),
  renameTable: z
    .object({
      newTableName: z
        .string()
        .min(1, 'New table name cannot be empty')
        .max(64, 'New table name must be less than 64 characters'),
    })
    .optional(),
});

export const updateTableSchemaResponse = z.object({
  message: z.string(),
  tableName: z.string(),
  operations: z.array(z.string()),
});

export const deleteTableResponse = z.object({
  message: z.string(),
  tableName: z.string(),
  nextActions: z.string(),
});

export type CreateTableRequest = z.infer<typeof createTableRequestSchema>;
export type CreateTableResponse = z.infer<typeof createTableResponseSchema>;
export type GetTableSchemaResponse = z.infer<typeof getTableSchemaResponseSchema>;
export type UpdateTableSchemaRequest = z.infer<typeof updateTableSchemaRequestSchema>;
export type UpdateTableSchemaResponse = z.infer<typeof updateTableSchemaResponse>;
export type DeleteTableResponse = z.infer<typeof deleteTableResponse>;
