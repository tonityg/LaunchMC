import {getLatestRelease} from "../Utils/HRemoteProfiles";
import {downloadAsync} from "../Utils/HDownload";
import {app, process} from "@electron/remote";
import path from "path";
import cp from "child_process"
import fs from "fs/promises";
const window = require("../Interface/UIElements/scripts/window.js")
const {addNotification} = require("../Interface/UIElements/scripts/notification.js")

let githubReleaseData: any = null;
export let updateAvailable = false;
export let newVersion: string

export async function checkForUpdate() {
    return new Promise<boolean>(async (resolve, reject) => {
        await getLatestRelease().then((res) => {
            const currentVersion = require("../../package.json").version;
            const latestVersion = res["tag_name"];

            githubReleaseData = res

            updateAvailable = currentVersion !== latestVersion;

            newVersion = latestVersion
            resolve(updateAvailable)
        }).catch((err) => reject(err))
    })
}

export async function updateCli() {
    return new Promise<void>(async (resolve, reject) => {
        if(githubReleaseData) {
            const dlUrl = githubReleaseData["assets"][0]["browser_download_url"]
            const name = githubReleaseData["assets"][0]["name"]

            await downloadAsync(dlUrl, path.join(app.getPath("temp"), name)).then(async (installerPath) => {
                const child = cp.spawn(`${installerPath}`, {detached: true})
                child.on("spawn", () => {
                    app.quit()
                })
            }).catch((err) => reject(err))
        } else {
            addNotification(`Impossible de mettre à jour le client, effectuez une vérification de mise à jour avant d'en lancer une.`, "error", undefined)
        }
    })
}