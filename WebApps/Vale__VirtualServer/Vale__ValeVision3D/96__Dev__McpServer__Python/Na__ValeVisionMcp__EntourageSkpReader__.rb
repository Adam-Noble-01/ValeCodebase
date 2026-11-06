# =============================================================================
# VALEVISION 3D MCP - READ ENTOURAGE COMPONENTS OUT OF SKETCHUP
# =============================================================================
#
# FILE       : Na__ValeVisionMcp__EntourageSkpReader__.rb
# PURPOSE    : Read flat figure components from their .skp files and write what they hold
#              as JSON, for Na__Entourage__BuildUtil__Library__.py convert
# CREATED    : 05-Nov-2026
#
# DESCRIPTION:
# - RUN INSIDE SKETCHUP, through the Na SketchUp MCP's ruby_eval, by the vv3d_entourage_import_skp
#   tool, or by hand: load this file, then Na__EntourageSkpReader.run(folder, out_path).
# - IT CHANGES NOTHING. Each .skp is loaded as a definition inside one operation that is then
#   aborted, so the open model ends as it began. Run transaction false: this makes its own.
#
# FRAMES:
# - SketchUp inches read, millimetres written, in the component's own axes: x across, y 0, z up,
#   the front on -y. There is no open-group question: a definition's points are its own.
#
# =============================================================================

require 'json'

module Na__EntourageSkpReader

    # FUNCTION | A Point in Mm, to Two Decimals
    # ------------------------------------------------------------
    def self.na_mm(point)
        [point.x.to_mm.round(2), point.y.to_mm.round(2), point.z.to_mm.round(2)]
    end
    # ------------------------------------------------------------


    # FUNCTION | What One Definition Holds
    # ------------------------------------------------------------
    def self.na_read(definition, file)
        faces = definition.entities.grep(Sketchup::Face)
        edges = definition.entities.grep(Sketchup::Edge)
        {
            file: file,
            name: definition.name,
            description: definition.description,
            behaviour: { always_face: definition.behavior.always_face_camera?, shadows_face_sun: definition.behavior.shadows_face_sun? },
            faces: faces.map { |face|
                {
                    mat: (face.material ? face.material.name : nil),
                    colour: (face.material ? face.material.color.to_a : nil),
                    loops: face.loops.map { |loop| { outer: loop.outer?, pts: loop.vertices.map { |vertex| na_mm(vertex.position) } } }
                }
            },
            loose_edges: edges.select { |edge| edge.faces.empty? }.map { |edge| [na_mm(edge.start.position), na_mm(edge.end.position)] }
        }
    end
    # ------------------------------------------------------------


    # FUNCTION | Read Every .skp in a Folder, or Only the Files Named
    # ------------------------------------------------------------
    def self.run(folder, out_path, only = nil)
        model = Sketchup.active_model
        paths = Dir.glob(File.join(folder.gsub('\\', '/'), '*.skp')).sort
        paths = paths.select { |path| only.include?(File.basename(path)) } if only
        rows = []
        model.start_operation('Read entourage components', true)
        begin
            paths.each do |path|
                rows << na_read(model.definitions.load(path), File.basename(path))
            end
        ensure
            model.abort_operation
        end
        File.write(out_path, JSON.generate(rows))
        { read: rows.size, files: rows.map { |row| row[:file] }, out: out_path }
    end
    # ------------------------------------------------------------

end

# =============================================================================
# END OF FILE
# =============================================================================
