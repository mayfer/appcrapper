

const fs = require('fs');
const path = require('path');

export default async function generator(appname: string, source: string) {
    if(source.includes('/* FILE: ')) {
        const data = source;

        let appdir = path.join(__dirname, '../../', 'generated_apps', appname);

        const srcfile = path.join(appdir, 'source.txt')
        fs.mkdirSync(path.dirname(srcfile), { recursive: true });
        fs.writeFileSync(srcfile, data);


        // split from lines that contain "/* FILE: {filename} */" and get filenames matched to their contents
        const filenames = data.toString().split(/\/\* FILE: (.*) \*\//).filter((_, i) => i % 2 === 1);
        let contents = data.toString().split(/\/\* FILE: (.*) \*\//).filter((_, i) => i % 2 === 0);


        // remove lines that start with ``` from contents
        contents.forEach((content, i) => {
            contents[i] = content.replace(/^```.*$/gm, '');
        });


        filenames.forEach((filename, i) => {
            const newfile = path.join(appdir, filename);
            let content = contents[i + 1];

            content = content.replace(/\/\* END_FILE \*\//gm, '');
            content = content.replace(/\/\* END_APP \*\//gm, '');
            content = content.replace(/\/\* FINISHED \*\//gm, '');

            console.log(`- saved ${filename}`);
            fs.mkdirSync(path.dirname(newfile), { recursive: true });
            fs.writeFileSync(newfile, content);
        });
    }
}