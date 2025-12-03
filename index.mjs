import core from "@actions/core";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { writeFile, access, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";

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

      // Use GITHUB_WORKSPACE if available (standard GitHub Actions workspace), otherwise fall back to cwd
      const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
      const outputPath = resolve(workspace, output);
      const relativePath = relative(workspace, outputPath);

      core.info(`Workspace: ${workspace}`);
      core.info(`Writing to file: ${outputPath} (resolved from: ${output})`);
      core.info(`Relative path from workspace: ${relativePath}`);

      try {
        await writeFile(outputPath, envs.join("\n"), { mode: 0o644 });

        // Verify the file was written and get its stats
        try {
          await access(outputPath);
          const stats = await stat(outputPath);
          core.info(`Successfully wrote and verified file: ${outputPath}`);
          core.info(
            `File size: ${stats.size} bytes, mode: ${stats.mode.toString(8)}`
          );
        } catch (accessError) {
          core.warning(
            `File written but cannot be accessed: ${accessError.message}`
          );
        }

        // Output both absolute and relative paths
        core.setOutput("file-path", outputPath);
        core.setOutput("file-path-relative", relativePath);
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
