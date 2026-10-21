export class BrowserProjectStore {
    keyPrefix;
    constructor(keyPrefix = 'tuydui-project:') {
        this.keyPrefix = keyPrefix;
    }
    async load(projectId) {
        const raw = localStorage.getItem(`${this.keyPrefix}${projectId}`);
        return raw ? JSON.parse(raw) : null;
    }
    async save(snapshot) {
        localStorage.setItem(`${this.keyPrefix}${snapshot.project.id}`, JSON.stringify(snapshot));
    }
}
