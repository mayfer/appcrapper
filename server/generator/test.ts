const path = require('path');

(async () => {

    const folder = path.join(__dirname, '../generated_apps/app-h59vjv');
    const build = await Bun.build({
        entrypoints: [path.join(folder, 'client/index.tsx')],
        outdir: path.join(folder, 'client'),
    });
    console.log('build', build);

    const files = build.outputs.map(output => {
        const basename = path.basename(output.path);
        const ext = path.extname(basename).slice(1);

        return {
            path: output.path,
            basename,
            extension: ext,
        };
    });


    const index_html_content = `<!doctype html>
    <html>
      ${files.filter(f => f.extension == 'css').map(f => `
      <link rel="stylesheet" href="/client/${f.basename}" />
      `.trim()).join('\n')}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <script type="module">
        ${files.filter(f => f.extension == 'js').map(f => `import '/client/${f.basename}';`).join('\n')}
      </script>
      <div id="root"></div>
    </html>`;
  
  
    await Bun.write(folder + '/server/index.html', index_html_content);

} )();
