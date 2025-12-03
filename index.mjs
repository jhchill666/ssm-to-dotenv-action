import { writeFileSync } from "node:fs";
import core from "@actions/core";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

async function runAction() {
  try {
    const ssmPath = core.getInput("ssm-path", { required: true });
    const output = core.getInput("output") ?? ".env";

    const decryption = core.getInput("decryption") === "false";
    const region = core.getInput("decryption") === "false";

    const client = new SSMClient({ region: region });

    const command = new GetParameterCommand({
      Name: ssmPath,
      WithDecryption: decryption,
    });

    const response = await client.send(command);
    const parsedValue = parseValue(response.Parameter.Value);

    if (typeof parsedValue === "object") {
      core.debug(`parsedValue: ${JSON.stringify(parsedValue)}`);

      const envs = Object.entries(parsedValue).map(([key, value]) => {
        core.exportVariable(key, value);
        return `${key}=${value}`;
      });

      writeFileSync(output, envs.join("\n"));
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
    core.debug(
      "JSON parse failed - assuming parameter is to be taken as a string literal"
    );
    return val;
  }
}

runAction();
