export function createMermaidRenderer(load = () => import('mermaid')) {
    let library, queue = Promise.resolve(), number = 0;
    const getLibrary = () => library ||= load().then(module => {
        const mermaid = module.default || module;
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral',
            suppressErrorRendering: true, htmlLabels: false, flowchart: { htmlLabels: false },
            fontFamily: 'system-ui, sans-serif', maxTextSize: 50000, maxEdges: 500 });
        return mermaid;
    }).catch(error => { library = null; throw error; });
    // Mermaid shares internal state. Serialize rendering and keep a failed
    // diagram from preventing the next valid diagram from rendering.
    return (source, isCurrent = () => true) => {
        const task = queue.then(async () => {
            if (!isCurrent()) return null;
            const mermaid = await getLibrary();
            if (!isCurrent()) return null;
            const { svg } = await mermaid.render(`cms-mermaid-${++number}`, source);
            return isCurrent() ? svg : null;
        });
        queue = task.catch(() => {});
        return task;
    };
}
