"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addInstanceElement = exports.generateInstanceBtn = void 0;
function generateInstanceBtn(opts) {
    const instanceElement = document.createElement("div");
    const textElement = document.createElement("p");
    textElement.innerText = opts.name;
    instanceElement.append(textElement);
    instanceElement.id = opts.name;
    instanceElement.classList.add("instance");
    return instanceElement;
}
exports.generateInstanceBtn = generateInstanceBtn;
function addInstanceElement(instanceOpts, parentDiv) {
    const instanceElement = generateInstanceBtn(instanceOpts);
    parentDiv.appendChild(instanceElement);
    return instanceElement;
}
exports.addInstanceElement = addInstanceElement;
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
