require 'sketchup.rb'
require 'json'

module EdgeGLBExporter
  
  def self.run
    model = Sketchup.active_model
    selection = model.selection
    
    path = UI.savepanel("Export Edges to GLB", "", "model_edges_clean.glb")
    return unless path

    positions = [] 
    colors = []
    
    entities_to_process = selection.empty? ? model.entities : selection.to_a
    tr = Geom::Transformation.new
    
    collect_edges(entities_to_process, tr, positions, colors)

    if positions.empty?
      UI.messagebox("No visible edges found to export.")
      return
    end

    write_glb(path, positions, colors)
    
    UI.messagebox("Export Complete: #{positions.length / 3} vertices exported.")
  end

  def self.collect_edges(entities, transform, positions, colors)
    entities.each do |entity|
      if entity.is_a?(Sketchup::Edge)
        
        # =========================================================
        # === NEW SECTION: VISIBILITY CHECKS ======================
        # =========================================================
        
        # 1. Skip if the user explicitly hid the edge
        next if entity.hidden?
        
        # 2. Skip if the edge is "soft" (part of a curved surface blend)
        next if entity.soft?
        
        # 3. Skip if the edge is "smooth" (blended shading)
        next if entity.smooth?
        
        # 4. Skip if the Layer/Tag is turned off
        next unless entity.layer.visible?

        # =========================================================
        # === END NEW SECTION =====================================
        # =========================================================

        # Apply current transformation to vertices
        pt_start = entity.start.position.transform(transform)
        pt_end   = entity.end.position.transform(transform)
        
        # Convert to GLTF coords (Right-handed Y-up)
        positions.push(pt_start.x.to_f.to_m, pt_start.z.to_f.to_m, -pt_start.y.to_f.to_m)
        positions.push(pt_end.x.to_f.to_m,   pt_end.z.to_f.to_m,   -pt_end.y.to_f.to_m)
        
        # Get Color
        col = entity.material ? entity.material.color : Sketchup::Color.new(0, 0, 0)
        
        r = col.red / 255.0
        g = col.green / 255.0
        b = col.blue / 255.0
        a = col.alpha / 255.0
        
        2.times { colors.push(r, g, b, a) }
        
      elsif entity.is_a?(Sketchup::Group)
        # Check if the Group itself is hidden or on a hidden layer
        next if entity.hidden?
        next unless entity.layer.visible?
        
        collect_edges(entity.entities, transform * entity.transformation, positions, colors)
        
      elsif entity.is_a?(Sketchup::ComponentInstance)
        # Check if the Component Instance is hidden or on a hidden layer
        next if entity.hidden?
        next unless entity.layer.visible?

        collect_edges(entity.definition.entities, transform * entity.transformation, positions, colors)
      end
    end
  end

  def self.write_glb(path, positions, colors)
    # [Same binary writing logic as before]
    vertex_count = positions.length / 3
    
    pos_bin = positions.pack("e*") 
    col_bin = colors.pack("e*")    
    
    pos_padding = (4 - (pos_bin.bytesize % 4)) % 4
    col_padding = (4 - (col_bin.bytesize % 4)) % 4
    
    pos_bin << "\0" * pos_padding
    col_bin << "\0" * col_padding
    
    buffer_data = pos_bin + col_bin
    buffer_length = buffer_data.bytesize

    json = {
      "asset" => { "version" => "2.0", "generator" => "SketchUp Edge Exporter" },
      "scene" => 0,
      "scenes" => [{ "nodes" => [0] }],
      "nodes" => [{ "mesh" => 0 }],
      "meshes" => [{
        "primitives" => [{
          "attributes" => {
            "POSITION" => 0,
            "COLOR_0" => 1
          },
          "mode" => 1 
        }]
      }],
      "buffers" => [{ "byteLength" => buffer_length }],
      "bufferViews" => [
        {
          "buffer" => 0,
          "byteOffset" => 0,
          "byteLength" => pos_bin.bytesize,
          "target" => 34962 
        },
        {
          "buffer" => 0,
          "byteOffset" => pos_bin.bytesize,
          "byteLength" => col_bin.bytesize,
          "target" => 34962 
        }
      ],
      "accessors" => [
        { 
          "bufferView" => 0,
          "componentType" => 5126, 
          "count" => vertex_count,
          "type" => "VEC3",
          "min" => [positions.each_slice(3).map(&:first).min, positions.each_slice(3).map{|s| s[1]}.min, positions.each_slice(3).map(&:last).min],
          "max" => [positions.each_slice(3).map(&:first).max, positions.each_slice(3).map{|s| s[1]}.max, positions.each_slice(3).map(&:last).max]
        },
        { 
          "bufferView" => 1,
          "componentType" => 5126, 
          "count" => vertex_count,
          "type" => "VEC4"
        }
      ]
    }

    json_str = json.to_json
    json_padding = (4 - (json_str.bytesize % 4)) % 4
    json_str << " " * json_padding
    
    total_length = 12 + 8 + json_str.bytesize + 8 + buffer_length
    header = ["glTF".unpack("L")[0], 2, total_length].pack("L<*")
    chunk0_header = [json_str.bytesize, 0x4E4F534A].pack("L<*")
    chunk1_header = [buffer_length, 0x004E4942].pack("L<*") 
    
    File.open(path, 'wb') do |f|
      f.write(header)
      f.write(chunk0_header)
      f.write(json_str)
      f.write(chunk1_header)
      f.write(buffer_data)
    end
  end
end

unless file_loaded?(__FILE__)
  UI.menu("Extensions").add_item("Export Edges to GLB") {
    EdgeGLBExporter.run
  }
  file_loaded(__FILE__)
end