const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

(async function() {
  try {
    console.log('🚀 Starting ngrok tunnel...');

    // Kill any existing ngrok processes
    try {
      execSync('killall ngrok 2>/dev/null || true', { stdio: 'ignore' });
      console.log('✓ Killed existing ngrok processes');
    } catch (e) {
      // Ignore errors
    }

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Start ngrok as subprocess
    const ngrokProcess = spawn('ngrok', ['http', '3000', '--log=stdout']);

    let url = null;

    ngrokProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output.trim());

      // Parse URL from ngrok output
      const match = output.match(/url=(https:\/\/[^\s]+)/);
      if (match && !url) {
        url = match[1];
        console.log(`\n✅ Ngrok tunnel established: ${url}\n`);

        // Update .env.local with ngrok URL
        const envPath = path.join(__dirname, '..', '.env.local');
        let envContent = '';

        // Read existing .env.local if it exists
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }

        // Update or add NEXT_PUBLIC_BASE_URL
        const baseUrlRegex = /^NEXT_PUBLIC_BASE_URL=.*/m;
        const newBaseUrl = `NEXT_PUBLIC_BASE_URL=${url}`;

        if (baseUrlRegex.test(envContent)) {
          envContent = envContent.replace(baseUrlRegex, newBaseUrl);
        } else {
          envContent += `\n${newBaseUrl}\n`;
        }

        // Write back to .env.local
        fs.writeFileSync(envPath, envContent);
        console.log(`✅ Updated .env.local with ngrok URL: ${url}`);
        console.log('');
        console.log('🎯 You can now test QStash integration!');
        console.log('   The tunnel will stay open until you stop this process.');
        console.log('');
      }
    });

    ngrokProcess.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    ngrokProcess.on('close', (code) => {
      console.log(`ngrok process exited with code ${code}`);
      process.exit(code || 0);
    });

    // Handle SIGINT to cleanup
    process.on('SIGINT', () => {
      console.log('\n🛑 Closing ngrok tunnel...');
      ngrokProcess.kill();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error starting ngrok:', error);
    process.exit(1);
  }
})();
