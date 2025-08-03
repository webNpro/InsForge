import { z } from "zod";
import { columnSchema, tableSchema } from "./database.schema";

export const createTableRequestSchema = tableSchema
  .pick({
    table_name: true,
    columns: true,
  })
  .extend({
    rls_enabled: z.boolean().default(true),
  });

export const createTableResponseSchema = tableSchema
  .pick({
    table_name: true,
    columns: true,
  })
  .extend({
    message: z.string(),
    auto_fields: z.array(z.string()),
    nextAction: z.string(),
  });

export const getTableSchemaResponseSchema = tableSchema.pick({
  table_name: true,
  columns: true,
});

export const updateTableSchemaRequest = z.object({
  add_columns: z.array(columnSchema).optional(),
  drop_columns: z
    .array(
      z.object({
        name: z.string(),
      })
    )
    .optional(),
  rename_columns: z.record(z.string(), z.string()).optional(),
  add_fkey_columns: z.array(columnSchema).optional(),
  drop_fkey_columns: z
    .array(
      z.object({
        name: z.string(),
      })
    )
    .optional(),
});

export const updateTableSchemaResponse = z.object({
  message: z.string(),
  table_name: z.string(),
  operations: z.array(z.string()),
});

export const deleteTableResponse = z.object({
  message: z.string(),
  table_name: z.string(),
  nextAction: z.string(),
});

export type CreateTableRequest = z.infer<typeof createTableRequestSchema>;
export type CreateTableResponse = z.infer<typeof createTableResponseSchema>;
export type GetTableSchemaResponse = z.infer<
  typeof getTableSchemaResponseSchema
>;
export type UpdateTableSchemaRequest = z.infer<typeof updateTableSchemaRequest>;
export type UpdateTableSchemaResponse = z.infer<
  typeof updateTableSchemaResponse
>;
export type DeleteTableResponse = z.infer<typeof deleteTableResponse>;
