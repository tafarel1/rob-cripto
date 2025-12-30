import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { EventEmitter } from 'events';

interface BridgeCommand {
  id: string;
  command: string;
  payload: any;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

export class NativeBridge extends EventEmitter {
  private pythonProcess: ChildProcess | null = null;
  private rustProcess: ChildProcess | null = null;
  private pendingCommands: Map<string, BridgeCommand> = new Map();
  private isShuttingDown: boolean = false;

  constructor() {
    super();
    this.startPythonWorker();
    this.startRustWorker();
  }

  private startPythonWorker() {
    const backendRoot = process.cwd();
    const segments = backendRoot.split(path.sep);
    const lastSegment = segments[segments.length - 1];

    let scriptPath: string;
    if (lastSegment === 'backend') {
        scriptPath = path.join(backendRoot, 'native', 'python', 'quant_processor.py');
    } else {
        scriptPath = path.join(backendRoot, 'backend', 'native', 'python', 'quant_processor.py');
    }
    
    console.log(`Starting Python worker: ${scriptPath}`);
    
    this.pythonProcess = spawn('python', [scriptPath]);

    this.pythonProcess.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const response = JSON.parse(line);
          this.handleResponse(response);
        } catch (e) {
          console.error('Failed to parse Python output:', line);
        }
      }
    });

    this.pythonProcess.stderr?.on('data', (data) => {
      console.error('Python Worker Error:', data.toString());
    });

    this.pythonProcess.on('close', (code) => {
      console.log(`Python worker exited with code ${code}`);
      if (!this.isShuttingDown) {
        setTimeout(() => this.startPythonWorker(), 1000);
      }
    });
  }

  private startRustWorker() {
    // Determine path to Rust binary
    // Assuming development environment, use target/debug
    // In production, this should be configurable
    const backendRoot = process.cwd();
    // Adjust path based on where the process is running from. 
    // If running from v:\development\robo_cripto\backend, then backendRoot is correct.
    
    // Check if we are inside 'backend' folder or root
    const segments = backendRoot.split(path.sep);
    const lastSegment = segments[segments.length - 1];
    
    let binaryPath: string;
    if (lastSegment === 'backend') {
        binaryPath = path.join(backendRoot, 'native', 'trade-core-rs', 'target', 'debug', 'trade-core-rs.exe');
    } else {
        binaryPath = path.join(backendRoot, 'backend', 'native', 'trade-core-rs', 'target', 'debug', 'trade-core-rs.exe');
    }

    console.log(`Starting Rust worker: ${binaryPath}`);

    // Check if binary exists, if not, might need to wait or log error
    // For now, assume it exists (or will exist soon)
    
    this.rustProcess = spawn(binaryPath);
    
    this.rustProcess.on('error', (err) => {
        console.warn('Failed to start Rust worker (Binary might be missing):', err.message);
    });

    this.rustProcess.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const response = JSON.parse(line);
          this.handleResponse(response);
        } catch (e) {
          // Rust logs might end up here if not redirected to stderr, 
          // but we configured env_logger to stderr.
          // Still, good to be safe.
          console.log('Rust Output:', line); 
        }
      }
    });

    this.rustProcess.stderr?.on('data', (data) => {
      console.error('Rust Worker Log:', data.toString());
    });

    this.rustProcess.on('close', (code) => {
      console.log(`Rust worker exited with code ${code}`);
      if (!this.isShuttingDown) {
        setTimeout(() => this.startRustWorker(), 5000); // 5s retry for Rust
      }
    });
    
    this.rustProcess.on('error', (err) => {
        console.error('Failed to start Rust worker:', err);
    });
  }

  private handleResponse(response: any) {
    const { id, status, result, message, method, params } = response;
    
    // Handle Requests
    if (id) {
        const cmd = this.pendingCommands.get(id);
        
        if (cmd) {
            if (status === 'ok') {
                cmd.resolve(result);
            } else {
                cmd.reject(new Error(message || 'Unknown error'));
            }
            this.pendingCommands.delete(id);
        }
    }
    
    // Handle Notifications/Events (no ID)
    if (method) {
        this.emit(method, params);
    }
  }

  public async executeQuantTask(command: string, payload: any): Promise<any> {
    if (!this.pythonProcess) throw new Error("Python worker not running");

    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(7);
      this.pendingCommands.set(id, { id, command, payload, resolve, reject });

      const message = JSON.stringify({ id, command, payload }) + '\n';
      this.pythonProcess?.stdin?.write(message);
    });
  }

  public async executeRustTask(command: string, payload: any): Promise<any> {
    if (!this.rustProcess) throw new Error("Rust worker not running");

    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(7);
      this.pendingCommands.set(id, { id, command, payload, resolve, reject });

      const message = JSON.stringify({ id, command, payload }) + '\n';
      this.rustProcess?.stdin?.write(message);
    });
  }

  public shutdown() {
    this.isShuttingDown = true;
    if (this.pythonProcess) {
      this.pythonProcess.kill();
    }
    if (this.rustProcess) {
        this.rustProcess.kill();
    }
  }
}

export const nativeBridge = new NativeBridge();
