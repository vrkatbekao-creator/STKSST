/** Resolve public files at either a domain root or a project-site subdirectory. */
export function publicAsset(path:string){return `${import.meta.env?.BASE_URL??'/'}${path}`;}
