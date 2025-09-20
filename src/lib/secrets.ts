import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({});

type SecretMap = Record<string, string | undefined>;

const cache: Partial<SecretMap> = {};

export async function getSecretValue(secretId: string): Promise<string | undefined> {
  if (cache[secretId] !== undefined) return cache[secretId];
  try {
    const res = await client.send(
      new GetSecretValueCommand({ SecretId: secretId })
    );
    const val = res.SecretString;
    cache[secretId] = val;
    return val ?? undefined;
  } catch (_err) {
    // If running locally without AWS creds, fall back to env
    return process.env[secretId];
  }
}

export async function getKeys(): Promise<{ openaiKey?: string; linearKey?: string }> {
  // Prefer AWS Secrets where present; fall back to env vars
  const [openaiSecret, linearSecret] = await Promise.all([
    getSecretValue(process.env.OPENAI_SECRET_ID || "OPENAI_API_KEY"),
    getSecretValue(process.env.LINEAR_SECRET_ID || "LINEAR_API_KEY"),
  ]);
  const openaiKey = openaiSecret || process.env.OPENAI_API_KEY;
  const linearKey = linearSecret || process.env.LINEAR_API_KEY;
  return { openaiKey, linearKey };
}


