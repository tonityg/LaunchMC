import fs from "fs/promises"
import path from "path"
import {instancesPath, localInstancesPath, serversInstancesPath} from "./const"
import {existsSync} from "fs"
import {concatJson, replaceAll} from "./Utils"
import {downloadMinecraft, patchInstanceWithForge} from "../App/DownloadGame";
import {downloadAsync} from "./HDownload";
import cp from "child_process";
import {getMetadataOf, listProfiles} from "./HRemoteProfiles";
import {setContentTo} from "../App/ServerInstances";
const {openPopup} = require("../Interface/UIElements/scripts/window.js")


export interface InstanceOpts {
    name: string,
    thumbnailPath: string,
    version: string,
}

export interface ServerInstanceOpts{
    name: string,
    thumbnailPath: string,
    logoPath: string,
    version: string,
}

export interface LoaderOpts {
    name: string,
    id: string
}

export async function generateInstanceBtn(opts: InstanceOpts | ServerInstanceOpts) {
    const instanceElement = document.createElement("div")

    const textElement = document.createElement("p")
    textElement.innerText = opts.name;
    instanceElement.append(textElement)

    instanceElement.id = opts.name
    instanceElement.classList.add("instance")

    return instanceElement
}

export async function addInstanceElement(instanceOpts: InstanceOpts | ServerInstanceOpts, parentDiv: HTMLElement){
    return new Promise<HTMLElement>(async (resolve, reject) => {
        await generateInstanceBtn(instanceOpts).then((instanceElement) => {
            parentDiv.appendChild(instanceElement)
            resolve(instanceElement)
        }).catch((err) => reject(err))
    })
}

/*export function updateInstanceDlProgress(instanceId: string, progress: number) {
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

}*/

/*export async function checkForUpdate(instanceId: string) {
    await updateInstanceDlState(instanceId, InstanceState.Loading)

    let updateFound = false

    // Check difference between this instance version and the serverside instance version
    // If version is different, delete game files and replace them and update instance properties

    if(updateFound) await updateInstanceDlState(instanceId, InstanceState.Update)

    await updateInstanceDlState(instanceId, InstanceState.Playable)
}*/

/*export async function checkInstanceIntegrity(instanceId: string) {
    await updateInstanceDlState(instanceId, InstanceState.Verification)

    // TODO: Code

    await updateInstanceDlState(instanceId, InstanceState.Playable)
}*/

/*
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
}*/
