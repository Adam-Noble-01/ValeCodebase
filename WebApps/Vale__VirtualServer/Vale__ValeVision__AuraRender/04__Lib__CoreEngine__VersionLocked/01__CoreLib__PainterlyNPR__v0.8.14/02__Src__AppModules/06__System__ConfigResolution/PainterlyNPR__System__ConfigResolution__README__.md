# 06__System__ConfigResolution

**01-09 · The spine** · reserved: a README until real code arrives

The seven configuration layers resolved in one documented, inspectable order.

**Belongs here**

- Engine defaults -> style preset -> material recipes -> semantic/object overrides -> camera and view preset -> Art Direction Points -> user/session UI preferences (kept apart from the artwork data).
- Named strategies such as `edgePriorityStrategy: "architectural"` - never conditional logic written into JSON.
- Every resolved value can say which layer set it: what `95__Dev__DiagnosticsPanel` shows when a line weight surprises.

**Takes** every preset and override. **Gives** one resolved, traceable settings object per render.

**Manifest:** §14 Proposed Configuration Layers.
