import { createTemplateAction, parseRepoUrl } from '@backstage/plugin-scaffolder-node';
import { InputError } from '@backstage/errors';
import { DefaultGithubCredentialsProvider, GithubCredentialsProvider, ScmIntegrationRegistry } from '@backstage/integration';
import { Octokit } from "octokit";

async function getOctokitOptions(options: {
    integrations: ScmIntegrationRegistry;
    credentialsProvider?: GithubCredentialsProvider;
    token?: string;
    repoUrl: string;
}) {
    const { integrations, credentialsProvider, token, repoUrl } = options;

    const { owner, repo, host } = parseRepoUrl(repoUrl, integrations);

    if (!owner || !repo || !host) {
        throw new InputError('Invalid repo URL');
    }

    const integrationConfig = integrations.github.byHost(host)?.config;

    if (!integrationConfig) {
        throw new InputError(
            `No GitHub integration found for repository URL: ${repoUrl}`,
        );
    }

    if (token) {
        return {
            auth: token
        }
    }

    const githubCredentialsProvider = credentialsProvider ?? DefaultGithubCredentialsProvider.fromIntegrations(integrations);

    const { token: credentialProviderToken } = await githubCredentialsProvider.getCredentials({ url: `https://${host}/${encodeURIComponent(owner)}/${encodeURIComponent(repo,)}`, });

    if (!credentialProviderToken) {
        throw new InputError(
            `No token available for host: ${host}, with owner ${owner}, and repo ${repo}`,
        );
    }

    return {
        auth: credentialProviderToken,
    };
}


export function githubEnableGHAS(options: {
    integrations: ScmIntegrationRegistry;
    githubCredentialsProvider?: GithubCredentialsProvider;
}) {

    const { integrations, githubCredentialsProvider } = options;

    return createTemplateAction<{
        repoUrl: string,
        code_scanning: string,
        secret_scanning: string,
        push_secret_protection: string,
        dependabot: string,
        token?: string

    }>({
        id: 'github:ghas:configure',
        schema: {
            input: {
                required: ['repoUrl', 'code_scanning', 'secret_scanning', 'push_secret_protection', 'dependabot'],
                type: 'object',
                properties: {
                    repoUrl: {
                        type: 'string',
                        title: 'Repo URL',
                        description: 'The URL of the repository to enable GHAS for',
                    },
                    code_scanning: {
                        type: 'string',
                        title: 'Code Scanning',
                        description: 'Enable GitHub Advanced Security for this repository',
                    },
                    secret_scanning: {
                        type: 'string',
                        title: 'Secret Scanning',
                        description: 'Enable GitHub Advanced Security for this repository',
                    },
                    push_secret_protection: {
                        type: 'string',
                        title: 'Push Secret Protection',
                        description: 'Enable GitHub Advanced Security for this repository',
                    },
                    dependabot: {
                        type: 'string',
                        title: 'Dependabot',
                        description: 'Enable GitHub Advanced Security for this repository',
                    },
                },
            },
        },
        async handler(ctx) {

            const {
                repoUrl,
                code_scanning,
                secret_scanning,
                push_secret_protection,
                dependabot,
                token: providedToken
            } = ctx.input;

            try {

                ctx.logger.info(`Enabling GHAS for ${repoUrl}`);
                ctx.logger.info(`Code Scanning: ${code_scanning}`);
                ctx.logger.info(`Secret Scanning: ${secret_scanning}`);
                ctx.logger.info(`Push Secret Protection: ${push_secret_protection}`);
                ctx.logger.info(`Dependabot: ${dependabot}`);                

                const { owner, repo } = parseRepoUrl(repoUrl, integrations);

                if (!owner || !repo) {
                    throw new InputError('Invalid repo URL');
                }

                const octoKitOptions = await getOctokitOptions({
                    integrations,
                    credentialsProvider: githubCredentialsProvider,
                    token: providedToken,
                    repoUrl: repoUrl
                });

                // ctx.logger.info(`Got token from ${octoKitOptions.auth}`);

                const octokit = new Octokit(octoKitOptions);                

                await octokit.request('PATCH /repos/{owner}/{repo}', {
                    owner: owner,
                    repo: repo,
                    'private': false, // I change this to test GHAS configuration
                    security_and_analysis: {
                        secret_scanning: {
                            status: ctx.input.secret_scanning
                        },
                        secret_scanning_push_protection: {
                            status: ctx.input.push_secret_protection
                        }
                    },
                    headers: {
                        'X-GitHub-Api-Version': '2022-11-28'
                    }
                });


            } catch (error) {
                throw new InputError('Failed to enable GHAS', error);
            }
        },
    });
};