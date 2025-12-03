import core from "@actions/core";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

async function runAction() {
  try {
    const ssmPath = core.getInput("ssm-path", { required: true });
    const output = core.getInput("output") ?? ".env";

    const decryption = core.getInput("decryption") !== "false";
    const region = core.getInput("aws-region") || "eu-west-2";

    const client = new SSMClient({ region: region });

    core.info(`Loading: ${ssmPath}`);
    const command = new GetParameterCommand({
      Name: ssmPath,
      WithDecryption: decryption,
    });

    const response = await client.send(command);
    const parsedValue = parseValue(response.Parameter.Value);

    core.info(`Loaded: ${JSON.stringify(parsedValue)}`);

    if (typeof parsedValue === "object") {
      core.debug(`parsedValue: ${JSON.stringify(parsedValue)}`);

      const envs = Object.entries(parsedValue).map(([key, value]) => {
        core.exportVariable(key, value);
        return `${key}=${value}`;
      });

      const outputPath = resolve(process.cwd(), output);
      core.info(`Writing to file: ${outputPath} (resolved from: ${output})`);

      try {
        await writeFile(outputPath, envs.join("\n"));
        core.info(`Successfully wrote file to: ${outputPath}`);
      } catch (writeError) {
        core.error(`Failed to write file: ${writeError.message}`);
        throw writeError;
      }

      core.info(`Environments exported: ${envs.join("\n")}`);
    } else {
      core.error(`Value not json: ${parsedValue}`);
    }
  } catch (e) {
    core.setFailed(e.message);
  }
}

function parseValue(val) {
  try {
    return JSON.parse(val);
  } catch {
    core.info(
      "JSON parse failed - assuming parameter is to be taken as a string literal"
    );
    return val;
  }
}

runAction();
