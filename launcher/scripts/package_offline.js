/**
 * Script para gerar pacote offline
 * Uso: node launcher/scripts/package_offline.js
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'dist');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const ARCHIVE_NAME = `robocrypto_offline_${process.platform}_${TIMESTAMP}`;

// Ensure dist dir
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

console.log(`\x1b[36m[Packager]\x1b[0m Iniciando criação de pacote offline para ${process.platform}...`);
console.log(`\x1b[36m[Packager]\x1b[0m Raiz do projeto: ${PROJECT_ROOT}`);

async function createZip() {
    if (process.platform === 'win32') {
        const zipPath = path.join(OUTPUT_DIR, `${ARCHIVE_NAME}.zip`);
        console.log(`\x1b[33m[Packager]\x1b[0m Criando arquivo ZIP em: ${zipPath}`);
        
        // PowerShell Compress-Archive is easier to use without external deps
        // We exclude .git, dist, logs, temp
        const exclude = ['dist', '.git', 'launcher\\logs', 'launcher\\temp'];
        const excludeArgs = exclude.map(e => `-NotLike "*\\${e}*"`).join(' -and $_.FullName ');
        
        // This is a simplified approach. Ideally we use a proper library.
        // For robustness without deps, we might just tell the user to zip it.
        // But let's try calling powershell.
        
        const psCommand = `
            $source = "${PROJECT_ROOT}"
            $destination = "${zipPath}"
            $exclude = @(".git", "dist", "launcher\\logs", "launcher\\temp", "launcher\\backups")
            
            Write-Host "Compactando arquivos..."
            Compress-Archive -Path $source -DestinationPath $destination -CompressionLevel Optimal -Force
        `;
        
        const child = spawn('powershell', ['-Command', psCommand], { stdio: 'inherit' });
        
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`\x1b[32m[Packager]\x1b[0m Pacote criado com sucesso!`);
                console.log(`\x1b[32m[Packager]\x1b[0m Local: ${zipPath}`);
            } else {
                console.log(`\x1b[31m[Packager]\x1b[0m Erro ao criar pacote (Código ${code}).`);
            }
        });

    } else {
        const tarPath = path.join(OUTPUT_DIR, `${ARCHIVE_NAME}.tar.gz`);
        console.log(`\x1b[33m[Packager]\x1b[0m Criando arquivo TAR.GZ em: ${tarPath}`);
        
        const child = spawn('tar', [
            '-czf', tarPath,
            '--exclude=.git',
            '--exclude=dist',
            '--exclude=launcher/logs',
            '--exclude=launcher/temp',
            '--exclude=launcher/backups',
            '-C', path.dirname(PROJECT_ROOT), // Go to parent dir
            path.basename(PROJECT_ROOT)       // Zip the project folder
        ], { stdio: 'inherit' });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`\x1b[32m[Packager]\x1b[0m Pacote criado com sucesso!`);
                console.log(`\x1b[32m[Packager]\x1b[0m Local: ${tarPath}`);
            } else {
                console.log(`\x1b[31m[Packager]\x1b[0m Erro ao criar pacote (Código ${code}).`);
            }
        });
    }
}

createZip();
