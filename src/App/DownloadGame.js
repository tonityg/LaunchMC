"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadAndGetJavaVersion = exports.JavaVersions = exports.minecraftLibraryList = exports.patchInstanceWithForge = exports.downloadMinecraft = void 0;
const HFileManagement_1 = require("../Utils/HFileManagement");
const original_fs_1 = require("original-fs");
const HManifests_1 = require("../Utils/HManifests");
const HDownload_1 = require("../Utils/HDownload");
const const_1 = require("../Utils/const");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const HInstance_1 = require("../Utils/HInstance");
const child_process_1 = __importDefault(require("child_process"));
const StartMinecraft_1 = require("./StartMinecraft");
const HMicrosoft_1 = require("../Utils/HMicrosoft");
function downloadMinecraft(version, instanceId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Préparation
        console.log("[INFO] Preparing to the download");
        yield (0, HInstance_1.updateInstanceDlState)(instanceId, HInstance_1.InstanceState.Loading);
        (0, HInstance_1.updateInstanceDlProgress)(instanceId, 0);
        // Variables de tracking du dl
        let numberOfLibrariesToDownload = 0;
        let numberOfLibrariesDownloaded = 0;
        let numberOfAssetsToDownload = 0;
        let numberOfAssetsDownloaded = 0;
        let totalSizeToDl = 0; // TODO: Compute this to track dl efficiently
        let currentDownloadedSize = 0;
        // Téléchargement/Récupération des manifests nécessaire
        const versionDataManifest = yield (0, HManifests_1.minecraftManifestForVersion)(version);
        console.log(versionDataManifest["assetIndex"]["url"]);
        console.log(path_1.default.join(const_1.indexesPath, versionDataManifest["assetIndex"]["id"] + ".json"));
        yield (0, HFileManagement_1.makeDir)(const_1.indexesPath);
        yield (0, HDownload_1.downloadAsync)(versionDataManifest["assetIndex"]["url"], path_1.default.join(const_1.indexesPath, versionDataManifest["assetIndex"]["id"] + ".json"), (progress) => {
            console.log(`Progression: ${progress}% du téléchargement du manifest des assets`);
            console.log("ASSETS DOWNLOADED");
        });
        const indexDataManifest = JSON.parse((yield promises_1.default.readFile(path_1.default.join(const_1.indexesPath, versionDataManifest["assetIndex"]["id"] + ".json"))).toString("utf-8"));
        if (indexDataManifest == null) {
            return;
        }
        // Initialisation du traking du dl
        numberOfLibrariesToDownload = versionDataManifest.libraries.length;
        for (const e in indexDataManifest.objects) {
            numberOfAssetsToDownload++;
        }
        console.log("numberOfAssetsToDownload: " + numberOfAssetsToDownload);
        // Calcul taille total
        // Calcul taille client + assets + libraries
        // client
        const clientSize = versionDataManifest.downloads.client.size;
        const assetsSize = versionDataManifest.assetIndex.totalSize;
        const librariesSize = minecraftLibraryTotalSize(versionDataManifest);
        totalSizeToDl = clientSize + assetsSize + librariesSize;
        // Téléchargement du client
        yield (0, HInstance_1.updateInstanceDlState)(instanceId, HInstance_1.InstanceState.Downloading);
        console.log("[INFO] Téléchargement du client");
        yield (0, HFileManagement_1.makeDir)(const_1.minecraftVersionPath);
        yield (0, HDownload_1.downloadAsync)(versionDataManifest.downloads.client.url, path_1.default.join(const_1.minecraftVersionPath, version, `${versionDataManifest.id}.jar`), (progress, byteSent) => {
            console.log(`Progression: ${progress}% du téléchargement du client de jeu`);
            currentDownloadedSize += byteSent;
            (0, HInstance_1.updateInstanceDlProgress)(instanceId, (currentDownloadedSize * 100) / totalSizeToDl);
        });
        // Téléchargement des librairies
        console.log("[INFO] Téléchargement des librairies");
        let librariesArg = "";
        for (let i = 0; i < versionDataManifest.libraries.length; i++) {
            const fetchedByte = yield downloadMinecraftLibrary(versionDataManifest, i);
            numberOfLibrariesDownloaded++;
            console.log(`Progression: ${numberOfLibrariesDownloaded * 100 / numberOfLibrariesToDownload}% du téléchargement des libraries`);
            currentDownloadedSize += fetchedByte;
            (0, HInstance_1.updateInstanceDlProgress)(instanceId, (currentDownloadedSize * 100) / totalSizeToDl);
        }
        // Téléchargement des assets
        console.log("[INFO] Téléchargement des assets");
        for (const e in indexDataManifest["objects"]) {
            console.log(`Progression: ${numberOfAssetsDownloaded * 100 / numberOfAssetsToDownload}`);
            const hash = indexDataManifest["objects"][e]["hash"];
            const subhash = hash.substring(0, 2);
            yield (0, HFileManagement_1.makeDir)(path_1.default.join(const_1.objectPath, subhash));
            const fullPath = path_1.default.join(const_1.instancesPath, instanceId, "resources", e);
            const fileName = fullPath.split("\\").pop();
            const dirPath = fullPath.substring(0, fullPath.indexOf(fileName));
            yield (0, HFileManagement_1.makeDir)(dirPath);
            yield (0, HDownload_1.downloadAsync)(path_1.default.join(const_1.resourcePackage, subhash, hash), path_1.default.join(const_1.objectPath, subhash, hash), (progress, byteSend) => {
                currentDownloadedSize += byteSend;
                (0, HInstance_1.updateInstanceDlProgress)(instanceId, (currentDownloadedSize * 100) / totalSizeToDl);
            });
            numberOfAssetsDownloaded++;
        }
        yield patchInstanceWithForge(instanceId, version, "1.18.2-40.2.10");
        yield (0, HInstance_1.updateInstanceDlState)(instanceId, HInstance_1.InstanceState.Playable);
    });
}
exports.downloadMinecraft = downloadMinecraft;
function patchInstanceWithForge(instanceId, mcVersion, forgeVersion) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        // Download java if it doesn't exist
        const java17Path = yield downloadAndGetJavaVersion(JavaVersions.JDK17);
        // DOWNLOAD VERSION FORGE MANIFEST TO GET ALL FORGE VERSION, SHOULDN'T BE HERE
        // await downloadAsync("https://files.minecraftforge.net/net/minecraftforge/forge/maven-metadata.json", path.join(dataPath, "maven-metadata.json"))
        // const forgeVersionListFile = await fs.readFile(path.join(dataPath, "maven-metadata.json"), "utf-8")
        // const forgeVersionList = JSON.parse(forgeVersionListFile)
        // Download forge installer, work only for all versions after 1.5.2
        const forgeInstallerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${forgeVersion}/forge-${forgeVersion}-installer.jar`; // FIXME: Can't work for version below 1.5.2 (installer version don't work)
        yield (0, HFileManagement_1.makeDir)(const_1.tempPath);
        yield (0, HDownload_1.downloadAsync)(forgeInstallerUrl, path_1.default.join(const_1.tempPath, forgeVersion + ".jar"));
        // Fetch install profile info to download libraries and others stuff
        yield (0, HFileManagement_1.extractSpecificFile)(path_1.default.join(const_1.tempPath, forgeVersion + ".jar"), "install_profile.json");
        const installProfileFile = yield promises_1.default.readFile(path_1.default.join(const_1.tempPath, "install_profile.json"), "utf-8");
        const installProfileJson = JSON.parse(installProfileFile);
        // Remove info file after fetch
        yield promises_1.default.unlink(path_1.default.join(const_1.tempPath, "install_profile.json"));
        console.log(installProfileJson);
        // Get all libraries to download
        let libraries;
        if (!installProfileJson.versionInfo)
            libraries = installProfileJson.libraries;
        else
            libraries = installProfileJson.versionInfo.libraries;
        if (installProfileJson.json) {
            yield (0, HFileManagement_1.makeDir)(path_1.default.join(const_1.minecraftVersionPath, forgeVersion));
            yield (0, HFileManagement_1.extractSpecificFile)(path_1.default.join(const_1.tempPath, forgeVersion + ".jar"), installProfileJson.json.startsWith("/") ? installProfileJson.json.substring(1) : installProfileJson.json, path_1.default.join(const_1.minecraftVersionPath, forgeVersion, forgeVersion + ".json"));
            const versionFile = yield promises_1.default.readFile(path_1.default.join(const_1.minecraftVersionPath, forgeVersion, forgeVersion + ".json"), "utf-8");
            libraries = libraries.concat(JSON.parse(versionFile).libraries);
        }
        // Skip forge extract and download it instead
        let skipForgeExtract = false;
        if (!installProfileJson.path || !installProfileJson.install.filePath) {
            skipForgeExtract = true;
        }
        console.log(libraries);
        for (const library of libraries) {
            console.log(library);
            if ((library.name.includes("minecraftforge") || library.name.includes("forge")) && !skipForgeExtract) {
                console.log("Skip " + library.name);
                continue;
            }
            const libraryPath = (yield (0, HFileManagement_1.mavenToArray)(library.name)).join("/");
            if (library.downloads && library.downloads.artifact) {
                const dlLink = library.downloads.artifact.url;
                const dlDest = library.downloads.artifact.path;
                if (dlLink == "") {
                    // Special case here
                    continue;
                }
                yield (0, HDownload_1.downloadAsync)(dlLink, path_1.default.join(const_1.librariesPath, dlDest));
                continue;
            }
            if (!library.url) {
                const forgeBaseUrl = "https://maven.minecraftforge.net/";
                yield (0, HDownload_1.downloadAsync)(`${forgeBaseUrl}${libraryPath}`, path_1.default.join(const_1.librariesPath, libraryPath), (prog, byte) => console.log(prog + " forge library"));
                continue;
            }
            else {
                yield (0, HDownload_1.downloadAsync)(`https://libraries.minecraft.net/${libraryPath}`, path_1.default.join(const_1.librariesPath, libraryPath), (prog, byte) => console.log(prog + " forge library"));
                continue;
            }
        }
        if (!skipForgeExtract) {
            const jarFilePath = installProfileJson.path || installProfileJson.install.filePath;
            const forgeJarPath = yield (0, HFileManagement_1.mavenToArray)(jarFilePath);
            const forgeJarPathWithoutFile = forgeJarPath.slice(0, forgeJarPath.length - 1).join("/");
            yield (0, HFileManagement_1.makeDir)(forgeJarPathWithoutFile);
            // Fetch the jar in the installer
            if (installProfileJson.install.filePath) {
                yield (0, HFileManagement_1.extractSpecificFile)(path_1.default.join(const_1.tempPath, forgeVersion + ".jar"), jarFilePath, path_1.default.join(const_1.librariesPath, forgeJarPath.join("/")));
            }
            // Search for the jar in maven folder in the installer
            else if (installProfileJson.path) {
                yield (0, HFileManagement_1.extractSpecificFile)(path_1.default.join(const_1.tempPath, forgeVersion + ".jar"), path_1.default.join("maven", jarFilePath), path_1.default.join(const_1.librariesPath, forgeJarPath.join("/")));
            }
        }
        if ((_a = installProfileJson.processors) === null || _a === void 0 ? void 0 : _a.length) {
            console.log("Patching Forge");
            const universalJarPath = installProfileJson.libraries.find((lib) => lib.name.startsWith("net.minecraftforge:forge")).downloads.artifact.path;
            console.log(universalJarPath);
            // Getting client.lzma from installer
            yield (0, HFileManagement_1.extractSpecificFile)(path_1.default.join(const_1.tempPath, forgeVersion + ".jar"), "data/client.lzma", path_1.default.join(const_1.librariesPath, installProfileJson.path ? (yield (0, HFileManagement_1.mavenToArray)(installProfileJson.path, "clientdata", "lzma")).join("/") : universalJarPath.slice(0, -4) + "-clientdata.lzma"));
            const { processors } = installProfileJson;
            for (const key in processors) {
                const p = processors[key];
                if (!p.sides || p.sides.includes("client")) {
                    const replaceDataArg = (arg) => __awaiter(this, void 0, void 0, function* () {
                        const finalArg = arg.replace("{", "").replace("}", "");
                        if (installProfileJson.data[arg]) {
                            if (finalArg == "BINPATCH") {
                                return path_1.default.join(const_1.librariesPath, ...(yield (0, HFileManagement_1.mavenToArray)(installProfileJson.path || universalJarPath)));
                            }
                            let res = installProfileJson.data[finalArg].client;
                            if (res.startsWith("[")) {
                                res = res.replace("[", "").replace("]", "");
                                res = (yield (0, HFileManagement_1.mavenToArray)(res)).join("/");
                                return `"${path_1.default.join(const_1.librariesPath, res)}"`;
                            }
                            return res;
                        }
                        return arg
                            .replace("{SIDE}", "client")
                            .replace("{ROOT}", `"${const_1.tempPath}"`)
                            .replace("{MINECRAFT_JAR}", `"${path_1.default.join(const_1.minecraftVersionPath, installProfileJson.minecraft, installProfileJson.minecraft + ".jar")}"`)
                            .replace("{MINECRAFT_VERSION}", `"${path_1.default.join(const_1.minecraftVersionPath, installProfileJson.minecraft, installProfileJson.minecraft + ".json")}"`)
                            .replace("{INSTALLER}", `"${path_1.default.join(const_1.tempPath, installProfileJson.version + ".jar")}"`)
                            .replace("{LIBRARY_DIR}", `"${const_1.librariesPath}"`);
                    });
                    const jarPath = path_1.default.join(const_1.librariesPath, ...(yield (0, HFileManagement_1.mavenToArray)(p.jar)));
                    const args = p.args.map((arg) => replaceDataArg(arg));
                    const classPaths = p.classpath.map((cp) => __awaiter(this, void 0, void 0, function* () { return `"${path_1.default.join(const_1.librariesPath, ...(yield (0, HFileManagement_1.mavenToArray)(cp)))}"`; }));
                    const mainClass = yield (0, HFileManagement_1.readJarMetaInf)(jarPath, "Main-Class");
                    yield new Promise((res) => {
                        const proc = child_process_1.default.spawn(path_1.default.join(java17Path, "javaw"), ['-classpath', [`"${jarPath}"`, ...classPaths].join(path_1.default.delimiter), mainClass, ...args]);
                        proc.stdout.on("data", data => console.log(data));
                        proc.stderr.on("data", data => console.error(data));
                        proc.on("close", code => { console.log("Exited with code " + code); res(); });
                    });
                }
            }
        }
        yield (0, StartMinecraft_1.startMinecraft)("1.12.2-forge1.12.2-14.23.0.2486", instanceId, { accesstoken: (yield (0, HMicrosoft_1.getActiveAccount)()).access_token, username: "ItsBursty", usertype: "msa", uuid: "5905494c31674f60abda3ac0bcbafcd7", versiontype: "Forge" });
    });
}
exports.patchInstanceWithForge = patchInstanceWithForge;
// Download Minecraft libraries
function downloadMinecraftLibrary(data, i) {
    return __awaiter(this, void 0, void 0, function* () {
        var fetchedByte = 0;
        if (data["libraries"][i].hasOwnProperty("rules")) {
            if (!parseRule(data["libraries"][i]["rules"])) {
                return 0;
            }
        }
        if (data["libraries"][i]["downloads"].hasOwnProperty("artifact")) {
            yield (0, HDownload_1.downloadAsync)(data["libraries"][i]["downloads"]["artifact"]["url"], path_1.default.join(const_1.librariesPath, data["libraries"][i]["downloads"]["artifact"]["path"]), (progress, byteSent) => {
                console.log(`Progression: ${progress}% du téléchargement`);
                fetchedByte += byteSent;
            });
        }
        if (data["libraries"][i]["downloads"].hasOwnProperty("classifiers")) {
            for (const e in data["libraries"][i]["downloads"]["classifiers"]) {
                if (e.includes("win") && os_1.default.platform() == "win32") {
                    yield (0, HDownload_1.downloadAsync)(data["libraries"][i]["downloads"]["classifiers"][e]["url"], path_1.default.join(const_1.librariesPath, data["libraries"][i]["downloads"]["classifiers"][e]["path"]), (progress, byteSent) => {
                        console.log(`Progression: ${progress}% du téléchargement`);
                        fetchedByte += byteSent;
                    });
                }
                else if ((e.includes("mac") || e.includes("osx")) && os_1.default.platform() == "darwin") {
                    yield (0, HDownload_1.downloadAsync)(data["libraries"][i]["downloads"]["classifiers"][e]["url"], path_1.default.join(const_1.librariesPath, data["libraries"][i]["downloads"]["classifiers"][e]["path"]), (progress, byteSent) => {
                        console.log(`Progression: ${progress}% du téléchargement`);
                        fetchedByte += byteSent;
                    });
                }
                else if (e.includes("linux") && os_1.default.platform() == "linux") {
                    yield (0, HDownload_1.downloadAsync)(data["libraries"][i]["downloads"]["classifiers"][e]["url"], path_1.default.join(const_1.librariesPath, data["libraries"][i]["downloads"]["classifiers"][e]["path"]), (progress, byteSent) => {
                        console.log(`Progression: ${progress}% du téléchargement`);
                        fetchedByte += byteSent;
                    });
                }
            }
        }
        return fetchedByte;
    });
}
function minecraftLibraryTotalSize(data) {
    let totalSize = 0;
    for (let i = 0; i < data.libraries.length; i++) {
        if (data["libraries"][i].hasOwnProperty("rules")) {
            if (!parseRule(data["libraries"][i]["rules"])) {
                continue;
            }
        }
        if (data["libraries"][i]["downloads"].hasOwnProperty("artifact")) {
            totalSize += data.libraries[i].downloads.artifact.size;
        }
        if (data["libraries"][i]["downloads"].hasOwnProperty("classifiers")) {
            for (const e in data["libraries"][i]["downloads"]["classifiers"]) {
                if (e.includes("win") && os_1.default.platform() == "win32") {
                    totalSize += data.libraries[i].downloads.classifiers[e].size;
                }
                else if ((e.includes("mac") || e.includes("osx")) && os_1.default.platform() == "darwin") {
                    totalSize += data.libraries[i].downloads.classifiers[e].size;
                }
                else if (e.includes("linux") && os_1.default.platform() == "linux") {
                    totalSize += data.libraries[i].downloads.classifiers[e].size;
                }
            }
        }
    }
    return totalSize;
}
function minecraftLibraryList(data) {
    let libraryList = [];
    for (let i = 0; i < data.libraries.length; i++) {
        if (data["libraries"][i].hasOwnProperty("rules")) {
            if (!parseRule(data["libraries"][i]["rules"])) {
                continue;
            }
        }
        if (data["libraries"][i]["downloads"].hasOwnProperty("artifact")) {
            libraryList.push(path_1.default.join(const_1.librariesPath, data.libraries[i].downloads.artifact.path));
        }
        if (data["libraries"][i]["downloads"].hasOwnProperty("classifiers")) {
            for (const e in data["libraries"][i]["downloads"]["classifiers"]) {
                if (e.includes("win") && os_1.default.platform() == "win32") {
                    libraryList.push(path_1.default.join(const_1.librariesPath, data.libraries[i].downloads.classifiers[e].path));
                }
                else if ((e.includes("mac") || e.includes("osx")) && os_1.default.platform() == "darwin") {
                    libraryList.push(path_1.default.join(const_1.librariesPath, data.libraries[i].downloads.classifiers[e].path));
                }
                else if (e.includes("linux") && os_1.default.platform() == "linux") {
                    libraryList.push(path_1.default.join(const_1.librariesPath, data.libraries[i].downloads.classifiers[e].path));
                }
            }
        }
    }
    return libraryList;
}
exports.minecraftLibraryList = minecraftLibraryList;
function parseRule(rules) {
    let condition = false;
    for (let i = 0; i < rules.length; i++) {
        if (rules[i].hasOwnProperty("os")) {
            if (rules[i]["os"]["name"] == "windows" && os_1.default.platform() == "win32") {
                if (rules[i]["action"] == "allow") {
                    condition = true;
                }
                else {
                    condition = false;
                }
            }
            else if (rules[i]["os"]["name"] == "osx" && os_1.default.platform() == "darwin") {
                if (rules[i]["action"] == "allow") {
                    condition = true;
                }
                else {
                    condition = false;
                }
            }
            else if (rules[i]["os"]["name"] == "linux" && os_1.default.platform() == "linux") {
                if (rules[i]["action"] == "allow") {
                    condition = true;
                }
                else {
                    condition = false;
                }
            }
        }
        else {
            if (rules[i]["action"] == "allow") {
                condition = true;
            }
            else {
                condition = false;
            }
        }
    }
    return condition;
}
function downloadLoggingXmlConfFile(data) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        console.log(data);
        if (!data.hasOwnProperty("logging")) {
            resolve("No logging key found, step passed.");
        }
        if (!(0, original_fs_1.existsSync)(const_1.loggingConfPath)) {
            yield promises_1.default.mkdir(const_1.loggingConfPath, { recursive: true });
        }
        yield (0, HDownload_1.downloadAsync)(data["logging"]["client"]["file"]["url"], path_1.default.join(const_1.loggingConfPath, data["logging"]["client"]["file"]["id"]), (progress) => {
            console.log(`Progression: ${progress}% du téléchargement`);
        });
        resolve("Log4j file downloaded");
    }));
}
var JavaVersions;
(function (JavaVersions) {
    JavaVersions[JavaVersions["JDK8"] = 0] = "JDK8";
    JavaVersions[JavaVersions["JDK17"] = 1] = "JDK17";
})(JavaVersions = exports.JavaVersions || (exports.JavaVersions = {}));
function downloadAndGetJavaVersion(version) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, HFileManagement_1.makeDir)(const_1.javaPath);
        if (version == JavaVersions.JDK8) {
            if ((0, original_fs_1.existsSync)(path_1.default.join(const_1.javaPath, const_1.java8Version, const_1.java8Name, "bin"))) {
                return path_1.default.join(const_1.javaPath, const_1.java8Version, const_1.java8Name, "bin");
            }
            yield (0, HDownload_1.downloadAsync)(const_1.java8Url, path_1.default.join(const_1.javaPath, `${const_1.java8Version}.zip`), (progress) => {
                console.log(`Progression: ${progress}% du téléchargement`);
            }, { decompress: true });
            return path_1.default.join(const_1.javaPath, const_1.java8Version, "bin");
        }
        if (version == JavaVersions.JDK17) {
            if ((0, original_fs_1.existsSync)(path_1.default.join(const_1.javaPath, const_1.java17Version, const_1.java17Name, "bin"))) {
                return path_1.default.join(const_1.javaPath, const_1.java17Version, const_1.java17Name, "bin");
            }
            yield (0, HDownload_1.downloadAsync)(const_1.java17Url, path_1.default.join(const_1.javaPath, `${const_1.java17Version}.zip`), (progress) => {
                console.log(`Progression: ${progress}% du téléchargement`);
            }, { decompress: true });
            return path_1.default.join(const_1.javaPath, const_1.java17Version, "bin");
        }
        return "";
    });
}
exports.downloadAndGetJavaVersion = downloadAndGetJavaVersion;
