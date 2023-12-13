import fs from "fs/promises"
import path from "path"
import {instancesPath, localInstancesPath, serversInstancesPath} from "./const"
import {existsSync} from "fs"
import {concatJson, replaceAll} from "./Utils"
import {downloadMinecraft, patchInstanceWithForge} from "../App/DownloadGame";
import {downloadAsync} from "./HDownload";
import cp from "child_process";
import {getMetadataOf, listProfiles} from "./HGitHub";
import isUrl from "is-url"
const {openPopup} = require("../Interface/UIElements/scripts/window.js")

let occupiedInstancesWithStates : any = {};
let dlServerOccupiedInstancesWithStates : any = {};

export async function addInstanceElement(imagePath: string, title: string, parentDiv: HTMLElement){
    const instanceElement = await generateInstanceBtn(imagePath, title)

    parentDiv.appendChild(instanceElement)

    return instanceElement
}

interface InstanceInfo {
    name: string,
    thumbnailPath: string,
    type: "instance"
}

interface ServerInstanceInfo{
    name: string,
    thumbnailPath: string,
    "coverPath": string,
    type: "server_instance"
}

interface LoaderInfo {
    name: string,
    id: string
}

export async function createInstance(version: string, instanceInfo: InstanceInfo | ServerInstanceInfo, loaderInfo?: LoaderInfo){
    return new Promise<void>(async (resolve )=> {
        await makeDir(path.join(serversInstancesPath, instanceInfo.name))

        let instanceConfiguration = {}

        // Default json configuration
        if(instanceInfo.type === 'server_instance') {
            instanceConfiguration = {
                "instance": {
                    "name": instanceInfo.name,
                    "thumbnail_path": instanceInfo.thumbnailPath,
                    "cover_path": instanceInfo.coverPath,
                    "play_time": 0,
                },
                "game": {
                    "version": version,
                }
            }
        } else {
            instanceConfiguration = {
                "instance": {
                    "name": instanceInfo.name,
                    "thumbnail_path": instanceInfo.thumbnailPath,
                    "play_time": 0,
                },
                "game_data": {
                    "version": version,
                }
            }
        }

        if(loaderInfo) {
            let defaultLoaderJson = {
                "loader": {
                    "name": loaderInfo.name,
                    "id": loaderInfo.id
                }
            }

            instanceConfiguration = concatJson(instanceConfiguration, defaultLoaderJson)
        }

        // Write instance conf on disk
        await fs.writeFile(path.join(serversInstancesPath, instanceInfo.name, "info.json"), JSON.stringify(
            instanceConfiguration
        ))

        // Update instance list
        await refreshLocalInstanceList()

        resolve()
    })
}

async function generateInstanceBtn(imagePath: string, title: string) {
    const instanceElement = document.createElement("div")

    // Instance text
    const titleElement = document.createElement("p")
    titleElement.innerText = title;
    instanceElement.append(titleElement)

    // Instance Btn
    instanceElement.id = title
    instanceElement.classList.add("instance")

    instanceElement.append(dlTrackerElement)

    instanceElement.addEventListener("click", async (e) => {
        await setContentTo(id)

        document.querySelector(".instance.active")?.classList.remove("active");
        instanceElement.classList.add("active");
    })

    instanceElement.addEventListener("mousedown", (e) => {
        if(e.button === 2) {
            // @ts-ignore
            const id = e.target.id
            // @ts-ignore
            const state = e.target.getAttribute("state")

            const rcMenu = document.getElementById("rcmenu-instance")
            // @ts-ignore
            rcMenu.style.top = e.clientY + "px"
            // @ts-ignore
            rcMenu.style.left = e.clientX + "px"
            // @ts-ignore
            rcMenu.style.display = "flex"

            document.getElementById("rc_delete_instance")!.onclick = async (e) => {
                if(state === InstanceState[InstanceState.Playable]) {
                    await fs.rm(path.join(instancesPath, id), {recursive: true})
                    await refreshInstanceList()
                } else {
                    console.log("Can't delete an instance which is occupied")
                }
            }

            document.getElementById("rc_open_instance_folder")!.onclick = (e) => {
                cp.exec(`start "" "${path.join(instancesPath, id)}"`)
            }
        }
    })

    instanceElement.setAttribute("onclick", 'require("./scripts/window.js").openWindow("instance-info")')
    
    return instanceElement
}

let currentContentId: string | null = null
export async function setContentTo(id: string) { // TODO: Cleaning
    currentContentId = id

    // Get instance state
    const instance = document.getElementById(id)
    const currentState = instance?.getAttribute("state")

    // Fetch instance json
    const instanceJson = await getInstanceData(id)
    
    // Hide current content
    const content = document.getElementById("content")!
    content.style.display = "none"

    // Show loading animation
    const loading = document.getElementById("instance-info-loading")!
    loading.style.display = "auto"

    // No data found, cancel process
    if(!instanceJson) {
        console.error("No instance data found");
        return
    }

    // Separate instance datas
    const instanceData = instanceJson.data.instanceData
    const gameData = instanceJson.data.gameData
    const loaderData = instanceJson.data.loader

    // Set title
    const contentTitle = document.getElementById("instance-title")!
    contentTitle.innerText = instanceData.name

    // Set author
    const contentAuthor = document.getElementById("instance-author")!
    contentAuthor.innerText = instanceData.author

    // Set version
    const widgetVersion = document.getElementById("widget-version")!
    widgetVersion.setAttribute("subname", gameData.versiontype)
    widgetVersion.innerText = gameData.version

    // Set modloader
    let currentModloader = loaderData?.name
    let modloaderId = loaderData?.id
    
    console.log(currentModloader);
    
    const widgetModloader = document.getElementById("widget-modloader")!
    widgetModloader.innerText = currentModloader ? currentModloader[0].toUpperCase() + currentModloader.slice(1) : "Vanilla"

    widgetModloader.setAttribute("subname", currentModloader ? modloaderId : gameData.version)

    // Set playtime
    const widgetPlaytime = document.getElementById("widget-playtime")!

    let h, m;
    const timeInMiliseconds = instanceData.playtime

    h = Math.floor(timeInMiliseconds / 1000 / 60 / 60);
    m = Math.floor((timeInMiliseconds / 1000 / 60 / 60 - h) * 60);

    m < 10 ? m = `0${m}` : m = `${m}`
    h < 10 ? h = `0${h}` : h = `${h}`

    widgetPlaytime.innerText = `${h}h${m}`

    // Set last played
    const widgetLastplayed = document.getElementById("widget-lastplayed")! // FIXME: Don't work
    widgetLastplayed.innerText = instanceData["lastplayed"]

    const widgetDesc = document.getElementById("widget-description")! // TODO: Write md rules

    const desc = await retrieveDescription(id)
    if(desc !== "") {
        widgetDesc.style.display = "flex"
        widgetDesc.innerText = desc
    } else {
        widgetDesc.style.display = "none"
    }

    const widgetPosts = document.getElementById("widget-post")!

    const posts = await retrievePosts(id)
    if(posts !== "") {
        widgetPosts.style.display = "flex"
        widgetPosts.innerText = desc
    } else {
        widgetPosts.style.display = "none"
    }

    const launchBtn = document.getElementById("launchbtn")!

    const accentColor = instanceData["accentColor"]
    contentAuthor.style.color = accentColor
    
    const color = Color(accentColor)
    const borderColor = color.darken(-.25).hex()
    
    launchBtn.style.backgroundColor = accentColor
    launchBtn.style.border = `solid ${borderColor}`
    launchBtn.style.boxShadow = `0 0 10px 1px ${accentColor}`

    launchBtn.innerText = "Play"

    if(currentState === InstanceState[InstanceState.Playing]){
        launchBtn.style.backgroundColor = "red"

        const color = Color("#ff0000")
        const borderColor = color.darken(-.25).hex()

        launchBtn.style.border = `solid ${borderColor}`
        launchBtn.style.boxShadow = `0 0 10px 1px red`

        launchBtn.innerText = "Stop"
    }
    else if(currentState === InstanceState[InstanceState.Update]){
        launchBtn.style.backgroundColor = "green"

        const color = Color("#00ff00")
        const borderColor = color.darken(-.25).hex()

        launchBtn.style.border = `solid ${borderColor}`
        launchBtn.style.boxShadow = `0 0 10px 1px green`

        launchBtn.innerText = "Update"
    }
    else if(currentState === InstanceState[InstanceState.Downloading]){
        launchBtn.style.backgroundColor = "#2b2b2b"
        launchBtn.style.border = `solid #363636`
        launchBtn.style.boxShadow = `0 0 10px 1px #2b2b2b`

        launchBtn.innerText = "Downloading"
    }
    else if(currentState === InstanceState[InstanceState.Loading]){
        launchBtn.style.backgroundColor = "#2b2b2b"
        launchBtn.style.border = `solid #363636`
        launchBtn.style.boxShadow = `0 0 10px 1px #2b2b2b`

        launchBtn.innerText = "Loading"
    }
    else if(currentState === InstanceState[InstanceState.Patching]) {
        launchBtn.style.backgroundColor = "#e05609"
        launchBtn.style.border = `solid #363636`
        launchBtn.style.boxShadow = `0 0 10px 1px #2b2b2b`

        launchBtn.innerText = "Patching"
    }
    else if(currentState === InstanceState[InstanceState.DLResources]) {
        launchBtn.style.backgroundColor = "#2b2b2b"
        launchBtn.style.border = `solid #363636`
        launchBtn.style.boxShadow = `0 0 10px 1px #2b2b2b`

        launchBtn.innerText = "Downloading Server Files"
    }
    else if(currentState === InstanceState[InstanceState.Verification]) {
        launchBtn.style.backgroundColor = "#2b2b2b"
        launchBtn.style.border = `solid #363636`
        launchBtn.style.boxShadow = `0 0 10px 1px #2b2b2b`

        launchBtn.innerText = "Verifying"
    }

export async function refreshServerInstanceList() {
    const instancesDiv = document.getElementById("own-servers")!
    instancesDiv.innerHTML = ""
    
    if(existsSync(instancesPath)){
        const instances = await fs.readdir(instancesPath)
        
        // Get all instances
        for(const e in instances){            
            if(existsSync(path.join(instancesPath, instances[e], "info.json"))){
                const data = await fs.readFile(path.join(instancesPath, instances[e], "info.json"), "utf8")
                const dataJson = JSON.parse(data)

                const element = await addInstanceElement(dataJson["instance"]["thumbnail_path"], dataJson["instance"]["name"], instancesDiv)
                element.addEventListener("click", async (e) => {
                    await setContentTo(dataJson["instance"]["name"])
                    openPopup('server-instance-info')
                })
            }
        }
    }

    restoreInstancesData();
}

export async function getInstanceData(instanceId: string){
    if(existsSync(instancesPath)){             
        const data = await fs.readFile(path.join(instancesPath, instanceId, "info.json"), "utf-8")
        const dataJson = JSON.parse(data)

        return {"data": dataJson, "gamePath": path.join(instancesPath, instanceId)}
    }
}

export function getInstanceById(id: string) {
    const instancesDiv = document.getElementById("instances")!

    for(let i = 0; i < instancesDiv.childElementCount; i++){        
        if(instancesDiv.children[i].getAttribute("instanceid") == id){
            return instancesDiv.children[i]     
        }
    }
} 

export function updateInstanceDlProgress(instanceId: string, progress: number) {
    const instance = document.getElementById(instanceId)

    const dlTracker = instance?.firstElementChild

    if(dlTracker == null) {
        return
    }

    console.log(progress);



    //@ts-ignore
    dlTracker.style.left = `${progress}%`;
    //@ts-ignore
    dlTracker.style.width = 100 - Number(dlTracker.style.left.substring(0, dlTracker.style.left.length - 1)) + '%';

}

export enum InstanceState {
    Loading,
    Downloading,
    ToDownload,
    DLResources,
    Verification,
    Patching,
    Playable,
    Update,
    Playing
}

export async function updateInstanceDlState(instanceId: string, newState: InstanceState) {
    const instance = document.getElementById(instanceId)
    
    instance?.setAttribute("state", InstanceState[newState])

    if(currentContentId == instanceId)
        await setContentTo(instanceId)
}

export function saveInstancesData() {
    const instances = document.getElementById("instance-list")!.children

    for (const e of instances) {
        // @ts-ignore
        instancesData[e.id] = {};
        // @ts-ignore
        instancesData[e.id]["state"] = e.getAttribute("state");
        // @ts-ignore
        instancesData[e.id]["dlCount"] = e.firstElementChild?.style.left;
    }

    console.log(instancesData)
}

export function restoreInstancesData() {
    const instances = document.getElementById("instance-list")!.children

    for (const e of instances) {
        console.log(instancesData.hasOwnProperty(e.id))
        if(instancesData.hasOwnProperty(e.id)) {
            // @ts-ignore
            e.setAttribute("state", instancesData[e.id]["state"]);
            console.log(e.getAttribute("state"));

            //@ts-ignore
            console.log(Number(instancesData[e.id]["dlCount"].substring(0, instancesData[e.id]["dlCount"].length - 1)))
            // @ts-ignore
            updateInstanceDlProgress(e.id, Number(instancesData[e.id]["dlCount"].substring(0, instancesData[e.id]["dlCount"].length - 1)))
        }

    }

    instancesData = [];
}

export async function convertProfileToInstance(metadata: any, instanceData: any) {
    const isVanilla = metadata["loader"] == null;

    await createInstance(metadata["mcVersion"], {
        name: instanceData["name"],
        accentColor: instanceData["accentColor"],
        author: instanceData["author"],
        imagePath: await downloadAsync(instanceData["thumbnailPath"], path.join(instancesPath, instanceData["name"], "thumbnail" + path.extname(instanceData["thumbnailPath"]))),
        versionType: metadata["type"]
    },
        !isVanilla ? {
        name: metadata["loader"]["name"],
        id: metadata["loader"]["id"]
    } : undefined)

    await downloadMinecraft(metadata["mcVersion"], instanceData["name"])
    if(!isVanilla) {
        await patchInstanceWithForge(instanceData["name"], metadata["mcVersion"], metadata["loader"]["id"])
    }

    await updateInstanceDlState(instanceData["name"], InstanceState.DLResources)

    // Download files
    for (const fileData of metadata["files"]) {
        const ext = path.extname(fileData.path)
        ext === ".zip" ? console.log("zip file detected") : null
        await downloadAsync(fileData.url, path.join(instancesPath, instanceData["name"], fileData.path), undefined, {decompress: ext === ".zip"})
    }

    await updateInstanceDlState(instanceData["name"], InstanceState.Playable)
}

export async function retrieveDescription(id: string) {
    // Get description on file server
    return JSON.parse(await fs.readFile(path.join(instancesPath, id, "info.json"), "utf-8")).instanceData.description
}

export async function retrievePosts(id: string): Promise<string> {
    // Get posts on file server
    return new Promise((resolve, reject) => {
        resolve("")
    })
}

export async function checkForUpdate(instanceId: string) {
    await updateInstanceDlState(instanceId, InstanceState.Loading)

    let updateFound = false

    // Check difference between this instance version and the serverside instance version
    // If version is different, delete game files and replace them and update instance properties

    if(updateFound) await updateInstanceDlState(instanceId, InstanceState.Update)

    await updateInstanceDlState(instanceId, InstanceState.Playable)
}

export async function checkInstanceIntegrity(instanceId: string) {
    await updateInstanceDlState(instanceId, InstanceState.Verification)

    // TODO: Code

    await updateInstanceDlState(instanceId, InstanceState.Playable)
}

export async function verifyInstanceFromRemote(name: string) {
    const profiles = await listProfiles()

    console.log(profiles)// @ts-ignore// @ts-ignore
    console.log(profiles.hasOwnProperty(name))

    // @ts-ignore
    if(!profiles.hasOwnProperty(name)) return;

    const metadata = await getMetadataOf(profiles![name])

    console.log(metadata)

    // Delete files not in server side
    const folders = metadata["folders"]
    for (const folder of folders) {
        await fs.rmdir(path.join(instancesPath, name, folder), {recursive: true})
    }

    // Download files not in the local side
    for (const fileData of metadata["files"]) {
        if(!existsSync(path.join(instancesPath, name, fileData["path"]))) {
            await downloadAsync(fileData["url"], path.join(instancesPath, name, fileData["path"]))
            console.log("downloaded: " + fileData["path"] + " from " + fileData["url"])
        }
    }
}