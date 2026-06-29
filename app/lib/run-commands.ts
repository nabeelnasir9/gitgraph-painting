export const MAC_RUN_COMMAND = `cd ~/Downloads
chmod +x gitgraph-painter.sh
./gitgraph-painter.sh`;

export const WINDOWS_RUN_COMMAND = `cd Downloads
Set-ExecutionPolicy -Scope Process Bypass
.\\gitgraph-painter.ps1`;

export const HELP_RUN_COMMAND = `# macOS or Linux
${MAC_RUN_COMMAND}

# Windows PowerShell
${WINDOWS_RUN_COMMAND}`;
