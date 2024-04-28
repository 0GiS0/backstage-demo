import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { writeFile } from 'fs';
import { InputError } from '@backstage/errors';

export function createNewFileAction() {
    return createTemplateAction<{ contents: string; filename: string }>({
        id: 'acme:file:create',
        schema: {
            input: {
                required: ['contents', 'filename'],
                type: 'object',
                properties: {
                    contents: {
                        type: 'string',
                        title: 'Contents',
                        description: 'The contents of the file',
                    },
                    filename: {
                        type: 'string',
                        title: 'Filename',
                        description: 'The filename of the file that will be created',
                    },
                },
            },
        },
        async handler(ctx) {
            const { signal } = ctx;

            try {
                await writeFile(
                    `${ctx.workspacePath}/${ctx.input.filename}`,
                    ctx.input.contents,
                    { signal },
                    _ => { },
                );
            } catch (error) {
                throw new InputError('Failed to create file', error);
            }
        },
    });
};