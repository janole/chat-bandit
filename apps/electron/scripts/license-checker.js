import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { globSync } from "glob";

const workspace = "electron-app";

let dependencies = JSON.parse(execSync(`npm ls --json --omit=dev --depth=0 -w ${workspace}`)).dependencies;

if (dependencies[workspace])
{
    dependencies = dependencies[workspace].dependencies;
}

const modulesDir = execSync("npm root").toString().trim();

const result = [];

for (const [name, { version }] of Object.entries(dependencies)) 
{
    const packageJson = JSON.parse(execSync(`npm view --no-workspaces --json ${name} name author version description license homepage repository`, { encoding: "utf8" }).trim());

    const licenseFile = globSync(`${modulesDir}/${name}/{license,license.txt,license.md}`, { nodir: true, nocase: true });

    const licenseText = licenseFile.length ? readFileSync(licenseFile[0]).toString() : undefined;

    result.push({ ...packageJson, installedName: name, installedVersion: version, licenseText });
}

writeFileSync("./resources/license.json", JSON.stringify(result, null, 2));
