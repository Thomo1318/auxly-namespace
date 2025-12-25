import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Auxly MCP Configuration for Antigravity IDE (Google)
 * Antigravity is a VSCode-based IDE that uses MCP configuration in ~/.gemini/antigravity/mcp_config.json
 * 
 * Configuration Location:
 * - Windows: %USERPROFILE%\.gemini\antigravity\mcp_config.json
 * - macOS/Linux: ~/.gemini/antigravity/mcp_config.json
 * 
 * IMPORTANT: Cross-platform Node.js detection is critical for proper MCP functionality.
 */

/**
 * Generate workspace hash for unique identification
 */
function generateWorkspaceHash(workspacePath: string): string {
    return crypto.createHash('md5').update(workspacePath).digest('hex').substring(0, 8);
}

/**
 * Find Node.js executable for Antigravity - cross-platform support
 * 
 * @returns Path to Node.js executable based on current platform
 */
function findNodeExecutable(): string {
    const platform = process.platform;
    
    // For macOS and Linux, prefer 'node' command which respects PATH
    // This handles version managers like nvm, volta, asdf properly
    if (platform === 'darwin' || platform === 'linux') {
        console.log('[Auxly MCP] ✅ Using system Node.js for', platform);
        return 'node';
    }
    
    // For Windows, try to find bundled or system Node.js
    if (platform === 'win32') {
        const antigravityPath = process.execPath;
        const antigravityDir = path.dirname(antigravityPath);
        
        // Common locations for bundled Node.js in Electron apps on Windows
        const possibleNodePaths = [
            path.join(antigravityDir, 'node.exe'),
            path.join(antigravityDir, 'resources', 'node.exe'),
            path.join(antigravityDir, 'resources', 'app', 'node.exe'),
            path.join(antigravityDir, 'resources', 'app', 'node_modules', 'electron', 'dist', 'node.exe'),
            path.join(antigravityDir, 'resources', 'app', 'node_modules', '.bin', 'node.exe'),
        ];
        
        for (const nodePath of possibleNodePaths) {
            if (fs.existsSync(nodePath)) {
                console.log('[Auxly MCP] ✅ Found bundled Node.js at:', nodePath);
                return nodePath;
            }
        }
        
        // Fallback: check common Windows Node.js installation paths
        const systemNodePaths = [
            'C:\\Program Files\\nodejs\\node.exe',
            'C:\\Program Files (x86)\\nodejs\\node.exe',
            path.join(os.homedir(), 'AppData', 'Roaming', 'nvm', 'current', 'node.exe'),
        ];
        
        for (const nodePath of systemNodePaths) {
            if (fs.existsSync(nodePath)) {
                console.log('[Auxly MCP] ✅ Using system Node.js at:', nodePath);
                return nodePath;
            }
        }
    }
    
    // Ultimate fallback: use 'node' command and hope it's in PATH
    console.log('[Auxly MCP] ⚠️  Could not find Node.js, using system node command (may fail on Windows)');
    return 'node';
}

/**
 * Get Antigravity config directory based on platform
 * Primary location: ~/.gemini/antigravity/
 * Secondary location: ~/.antigravity/
 */
function getAntigravityConfigDir(): string {
    const homeDir = os.homedir();
    
    // Primary location for Antigravity MCP config
    const possiblePaths = [
        path.join(homeDir, '.gemini', 'antigravity'),
        path.join(homeDir, '.antigravity'),
    ];
    
    console.log('[Auxly MCP] 🔍 Searching for existing Antigravity config directories...');
    
    // Check which directories exist and look for existing mcp_config.json
    for (const configPath of possiblePaths) {
        try {
            if (fs.existsSync(configPath)) {
                console.log('[Auxly MCP] 📁 Found directory:', configPath);
                const mcpConfigPath = path.join(configPath, 'mcp_config.json');
                if (fs.existsSync(mcpConfigPath)) {
                    console.log('[Auxly MCP] ✅ Found existing mcp_config.json at:', mcpConfigPath);
                    return configPath;
                }
            }
        } catch (error) {
            // Continue to next path
        }
    }
    
    // If no mcp_config.json found, use first existing directory or create primary
    for (const configPath of possiblePaths) {
        try {
            if (fs.existsSync(configPath)) {
                console.log('[Auxly MCP] ✅ Using existing Antigravity directory:', configPath);
                return configPath;
            }
        } catch (error) {
            // Continue to next path
        }
    }
    
    // Use primary location as default
    const defaultPath = possiblePaths[0];
    console.log('[Auxly MCP] 📁 Using default Antigravity config directory:', defaultPath);
    return defaultPath;
}

/**
 * Configure MCP server for Antigravity IDE
 * Writes configuration to Antigravity config directory with proper cross-platform Node.js detection
 */
export async function configureAntigravityMCP(
    context: vscode.ExtensionContext
): Promise<boolean> {
    try {
        console.log('========================================');
        console.log('[Auxly MCP] 🔍 ANTIGRAVITY CONFIGURATION START');
        console.log('========================================');
        
        // Check if running in remote/SSH environment
        const isRemote = vscode.env.remoteName !== undefined;
        const remoteType = vscode.env.remoteName || 'local';
        
        if (isRemote) {
            console.log(`[Auxly MCP] ✅ Detected remote environment: ${remoteType}`);
            console.log('[Auxly MCP] Configuring MCP for REMOTE server...');
        }
        
        // Add debug info for troubleshooting
        console.log('[Auxly MCP] Process execPath:', process.execPath);
        console.log('[Auxly MCP] VSCode version:', vscode.version);
        console.log('[Auxly MCP] Platform:', process.platform);
        console.log('[Auxly MCP] Remote mode:', isRemote);
        
        // Get workspace path (allow empty for no workspace scenario)
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspacePath = workspaceFolders && workspaceFolders.length > 0
            ? workspaceFolders[0].uri.fsPath
            : '';
        
        console.log('[Auxly MCP] 📁 Workspace Path:', workspacePath || 'NO WORKSPACE (will use global config)');
        
        // Get extension path and MCP server path
        const extensionPath = context.extensionPath;
        const mcpServerPath = path.join(extensionPath, 'dist', 'mcp-server', 'index.js');
        
        console.log('[Auxly MCP] 📦 Extension Path:', extensionPath);
        console.log('[Auxly MCP] 🔌 MCP Server Path:', mcpServerPath);
        
        // Verify MCP server exists
        const serverExists = fs.existsSync(mcpServerPath);
        console.log('[Auxly MCP] ✅ MCP Server Exists:', serverExists);
        
        if (!serverExists) {
            console.error('[Auxly MCP] ❌ MCP server not found at:', mcpServerPath);
            console.error('[Auxly MCP] ❌ CRITICAL: Cannot configure MCP without server file!');
            return false;
        }
        
        // Generate workspace ID
        const workspaceHash = workspacePath ? generateWorkspaceHash(workspacePath) : 'global';
        console.log('[Auxly MCP] 🔑 Workspace ID (hash):', workspaceHash);
        
        // Get API URL from configuration
        const apiUrl = vscode.workspace.getConfiguration('auxly')?.get<string>('apiUrl')
            || 'https://auxly.tzamun.com';
        
        // CRITICAL FIX: Use cross-platform Node.js detection
        const nodeExecutable = findNodeExecutable();
        
        console.log('[Auxly MCP] 🌐 API URL:', apiUrl);
        console.log('[Auxly MCP] 🖥️  Antigravity Path:', process.execPath);
        console.log('[Auxly MCP] 🟢 Node.js Path:', nodeExecutable);
        
        // Prepare MCP server configuration for Antigravity
        // Use forward slashes for cross-platform compatibility in JSON
        const normalizedMcpServerPath = mcpServerPath.replace(/\\/g, '/');
        const normalizedWorkspacePath = (workspacePath || os.homedir()).replace(/\\/g, '/');
        
        const auxlyServerConfig = {
            command: nodeExecutable,
            args: [normalizedMcpServerPath],
            env: {
                AUXLY_WORKSPACE_PATH: normalizedWorkspacePath,
                AUXLY_WORKSPACE_ID: workspaceHash,
                AUXLY_API_URL: apiUrl
            }
        };
        
        console.log('[Auxly MCP] ⚙️  Server Config:', JSON.stringify(auxlyServerConfig, null, 2));
        
        // Determine config paths based on environment
        const homeDir = os.homedir();
        let configPaths: string[];
        
        if (isRemote) {
            configPaths = [
                path.join(homeDir, '.antigravity-server', 'data', 'Machine', 'mcp_config.json')
            ];
            console.log('[Auxly MCP] Using REMOTE Antigravity MCP config paths');
        } else {
            configPaths = [
                path.join(homeDir, '.gemini', 'antigravity', 'mcp_config.json'),
                path.join(homeDir, '.antigravity', 'mcp_config.json')
            ];
            console.log('[Auxly MCP] Using LOCAL Antigravity MCP config paths');
        }
        
        let successCount = 0;
        
        for (const configPath of configPaths) {
            try {
                const configDir = path.dirname(configPath);
                console.log('[Auxly MCP] 📝 Writing to config path:', configPath);
                
                // Ensure directory exists
                if (!fs.existsSync(configDir)) {
                    console.log('[Auxly MCP] 📁 Creating config directory:', configDir);
                    fs.mkdirSync(configDir, { recursive: true });
                    console.log('[Auxly MCP] ✅ Directory created successfully');
                } else {
                    console.log('[Auxly MCP] ✅ Config directory already exists');
                }
                
                // Read existing config if present
                let existingConfig: any = {};
                if (fs.existsSync(configPath)) {
                    try {
                        const existingContent = fs.readFileSync(configPath, 'utf8');
                        if (existingContent && existingContent.trim().length > 0) {
                            existingConfig = JSON.parse(existingContent);
                            console.log('[Auxly MCP] ✅ Read existing config');
                            console.log('[Auxly MCP]   - Existing mcpServers:', Object.keys(existingConfig.mcpServers || {}));
                        } else {
                            console.log('[Auxly MCP] ⚠️ Config file is empty, will create new');
                            existingConfig = {};
                        }
                    } catch (error) {
                        console.warn('[Auxly MCP] ⚠️ Failed to parse existing config, will create new:', error);
                        existingConfig = {};
                    }
                } else {
                    console.log('[Auxly MCP] ℹ️ No existing config file at this location');
                }
                
                // Ensure mcpServers object exists
                if (!existingConfig.mcpServers || typeof existingConfig.mcpServers !== 'object') {
                    console.log('[Auxly MCP] 📝 Creating mcpServers object');
                    existingConfig.mcpServers = {};
                }
                
                // Add/update auxly server config
                existingConfig.mcpServers.auxly = auxlyServerConfig;
                console.log('[Auxly MCP] ✅ Added/updated auxly server config');
                
                // Write config file
                console.log('[Auxly MCP] 💾 Writing config file...');
                fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));
                console.log('[Auxly MCP] ✅ Config file written successfully');
                
                // Verify file was written
                if (fs.existsSync(configPath)) {
                    const fileSize = fs.statSync(configPath).size;
                    console.log('[Auxly MCP] ✅ Verified: File exists, size:', fileSize, 'bytes');
                    successCount++;
                } else {
                    console.error('[Auxly MCP] ❌ ERROR: File was not created!');
                }
                
            } catch (error) {
                console.error('[Auxly MCP] ❌ Failed to write config to', configPath, ':', error);
            }
        }
        
        console.log('========================================');
        console.log('[Auxly MCP] ✅ ANTIGRAVITY CONFIGURATION COMPLETE');
        console.log(`[Auxly MCP] ✅ Successfully wrote to ${successCount}/${configPaths.length} config locations`);
        console.log('========================================');
        
        if (successCount === 0) {
            console.error('[Auxly MCP] ❌ Failed to write to any config location!');
            return false;
        }
        
        console.log('[Auxly MCP] ✅ Successfully wrote Antigravity MCP config');
        console.log('[Auxly MCP] ✅ Antigravity will activate MCP automatically');
        
        return true;
        
    } catch (error) {
        console.error('[Auxly MCP] Failed to configure Antigravity MCP:', error);
        return false;
    }
}
