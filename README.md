# 🔐 SSM to Dotenv

A GitHub Action that loads an AWS SSM Parameter Store parameter and creates a `.env` file from it.

## Usage

```yaml
- name: Load SSM parameters to .env
  uses: jhchill666/ssm-to-dotenv-action@v1
  with:
    ssm-path: /my-app/config
    output: .env
    decryption: "true"
    aws-region: eu-west-2
```

## Inputs

| Input        | Description                       | Required | Default     |
| ------------ | --------------------------------- | -------- | ----------- |
| `ssm-path`   | SSM parameter path to load        | Yes      | -           |
| `output`     | Output filename for the .env file | No       | `.env`      |
| `decryption` | Whether to decrypt the parameter  | No       | `"false"`   |
| `aws-region` | AWS region for SSM                | No       | `eu-west-2` |

## Requirements

- AWS credentials configured in your GitHub Actions workflow (via `aws-actions/configure-aws-credentials` or environment variables)
- The SSM parameter value should be a JSON object (e.g., `{"KEY1":"value1","KEY2":"value2"}`)

## Example

```yaml
name: Example Workflow

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-2

      - name: Load SSM parameters
        uses: jhchill666/ssm-to-dotenv-action@v1
        with:
          ssm-path: /my-app/production/config
          decryption: "true"

      - name: Use environment variables
        run: |
          echo "Environment variables loaded from SSM"
          cat .env
```

## How it works

1. Fetches the specified parameter from AWS SSM Parameter Store
2. Parses the parameter value as JSON
3. Creates a `.env` file with `KEY=VALUE` pairs
4. Exports each variable as a GitHub Actions environment variable

## License

ISC
