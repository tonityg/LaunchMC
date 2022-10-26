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
exports.startMinecraft = void 0;
const HManifests_1 = require("../Helper/HManifests");
const child_process_1 = __importDefault(require("child_process"));
const path_1 = __importDefault(require("path"));
const const_1 = require("../Helper/const");
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
function startMinecraft(version, instanceId, opt) {
    (0, HManifests_1.minecraftManifestForVersion)(version).then((data) => __awaiter(this, void 0, void 0, function* () {
        // var mcArgs = []
        // if(data.hasOwnProperty("minecraftArguments")){
        //     var args = data["minecraftArguments"].split(" ")
        //     mcArgs = args
        // }else{
        //     var args: any = []
        //     for(var e in data["arguments"]["game"]){
        //         if(data["arguments"]["game"][e].hasOwnProperty("rules")){
        //             const rule = parseRule(data["arguments"]["game"][e])
        //             if(rule != undefined){
        //                 args.push(rule)
        //             }
        //         }else{
        //             args.push(data["arguments"]["game"][e])
        //         }
        //     }
        //     mcArgs = args
        // } 
        // Get all Minecraft arguments
        var mcArgs = data["minecraftArguments"];
        if (mcArgs == null) {
            mcArgs = "";
            for (let i = 0; i < data["arguments"]["game"].length; i++) {
                if (typeof data["arguments"]["game"][i] == "string") {
                    mcArgs += data["arguments"]["game"][i] + " ";
                }
            }
        }
        // Parse Minecraft arguments
        let tempSplitedArgs = mcArgs.split(" ");
        console.log(tempSplitedArgs);
        for (let i = 0; i < tempSplitedArgs.length; i++) {
            switch (tempSplitedArgs[i]) {
                case "${auth_player_name}":
                    tempSplitedArgs[i] = opt.username;
                    break;
                case "${version_name}":
                    tempSplitedArgs[i] = version;
                    break;
                case "${game_directory}":
                    tempSplitedArgs[i] = path_1.default.join(const_1.instancesPath, instanceId);
                    break;
                case "${assets_root}":
                    tempSplitedArgs[i] = const_1.assetsPath;
                    break;
                case "${assets_index_name}":
                    tempSplitedArgs[i] = JSON.parse((yield promises_1.default.readFile(path_1.default.join(const_1.instancesPath, instanceId, "info.json"), { encoding: "utf-8" })).toString())["assets_index_name"];
                    break;
                case "${auth_uuid}":
                    tempSplitedArgs[i] = opt.uuid;
                    break;
                case "${auth_access_token}":
                    tempSplitedArgs[i] = opt.accesstoken;
                    break;
                case "${user_properties}":
                    tempSplitedArgs[i] = opt.username;
                    break;
                case "${user_type}":
                    tempSplitedArgs[i] = "mojang";
                    break;
                case "${version_type}":
                    tempSplitedArgs[i] = opt.versiontype;
                    break;
                case "${game_assets}":
                    if (!fs_1.default.existsSync(const_1.legacyAssetsPath))
                        yield promises_1.default.mkdir(const_1.legacyAssetsPath, { recursive: true });
                    tempSplitedArgs[i] = const_1.legacyAssetsPath;
                    break;
                case "${auth_session}":
                    tempSplitedArgs[i] = "";
                    break;
                default:
                    break;
            }
        }
        mcArgs = tempSplitedArgs;
        console.log(mcArgs);
        // Set command arguments
        var jvmArgs = [];
        // jvmArgs.push("C:\\Program Files\\Eclipse Adoptium\\jdk-8.0.345.1-hotspot\\bin\\java")
        jvmArgs.push("-Xms2048M");
        jvmArgs.push("-Xmx4096M");
        jvmArgs.push("-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump");
        jvmArgs.push("-Djava.library.path=" + const_1.librariesPath);
        jvmArgs.push("-Dorg.lwjgl.librarypath=" + const_1.librariesPath);
        const libraries = yield getAllFile(const_1.librariesPath);
        // console.log(libraries);
        let librariesArg = JSON.parse(yield promises_1.default.readFile(path_1.default.join(const_1.instancesPath, instanceId, "info.json"), { encoding: "utf-8" }))["libraries"];
        // console.log(librariesArg);
        jvmArgs.push(`-cp`);
        jvmArgs.push(`${librariesArg};${path_1.default.join(const_1.minecraftVersionPath, version, `${version}.jar`)}`);
        jvmArgs.push("net.minecraft.client.main.Main");
        const fullMcArgs = [...jvmArgs, ...mcArgs];
        console.log(fullMcArgs);
        // Start Minecraft
        const proc = child_process_1.default.spawn("C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.4.101-hotspot\\bin\\java", fullMcArgs);
        proc.stdout.on("data", (data) => {
            console.log(data.toString("utf-8"));
        });
        proc.stderr.on("data", (data) => {
            console.error(data.toString("utf-8"));
        });
        // Build command string
        // var command: string = `C:\\Users\\tonib\\Downloads\\OpenJDK8U-jdk_x64_windows_hotspot_8u345b01\\jdk8u345-b01\\bin\\java`
        // for(var e in mcArgs){
        //     command += ` `
        //     command += mcArgs[e]
        // }
        // console.log(command);
    }));
}
exports.startMinecraft = startMinecraft;
function getAllFile(pathDir) {
    return __awaiter(this, void 0, void 0, function* () {
        let files = [];
        const items = yield promises_1.default.readdir(pathDir, { withFileTypes: true });
        for (const item of items) {
            if (item.isDirectory()) {
                files = [
                    ...files,
                    ...(yield getAllFile(path_1.default.join(pathDir, item.name)))
                ];
            }
            else {
                files.push(path_1.default.join(pathDir, item.name));
            }
        }
        return files;
    });
}
function buildLibrariesArgument(listOfLibraries, version, data) {
    return __awaiter(this, void 0, void 0, function* () {
        let final = "";
        for (let i = 0; i < listOfLibraries.length; i++) {
            final += listOfLibraries[i] + ";";
        }
        final += path_1.default.join(const_1.minecraftVersionPath, version, `${version}.json`);
        return final;
    });
}
function parseRule(rule) {
}
