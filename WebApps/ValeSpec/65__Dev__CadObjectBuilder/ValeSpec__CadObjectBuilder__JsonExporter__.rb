# =============================================================================
# VALESPEC - CAD OBJECT BUILDER - SKETCHUP JSON EXPORTER
# =============================================================================
#
# FILE    : ValeSpec__CadObjectBuilder__JsonExporter__.rb
# AUTHOR  : Adam Noble - Noble Architecture
# PURPOSE : Export selected SketchUp 2D geometry to structured JSON for the
#           ValeSpec hardware library. Writes a full hardware-object file:
#           ValeSpec__HardwareItemData (empty placeholders, keys retained) plus
#           HardwareItem__VectorData from the model, ValeSpec-style indentation.
# CREATED : Apr-2026
#
# DESCRIPTION:
# - Select all loose edges (2D linework) plus the 00__OriginPoint group.
# - Paste this script into the SketchUp Ruby Console and press Enter.
# - A Save dialog appears. Default filename is pre-filled; edit if needed.
# - The JSON is printed to the console AND written to the chosen file path.
# - Top-level metadata keys are present with empty / null placeholders for you
#   to fill or merge from another tool; vector paths and bbox come from SketchUp.
# - Arcs and circles export as arc primitives (center, radius, angles).
# - Straight edges export as individual line segments.
#
# SELECTION REQUIREMENTS:
# - Loose edges only. No faces required, no other groups.
# - One group named and tagged "00__OriginPoint".
#   The bounding box centre of this group becomes local 0,0.
#
# COORDINATE SYSTEM (OUTPUT):
# - Origin (0,0) = centre of the 00__OriginPoint group (e.g. spindle centre).
# - X = horizontal (positive = right).
# - Y = vertical   (positive = up).
# - Units = millimetres. SketchUp stores internally in inches; converted here.
# - Geometry assumed to lie in the XY plane. Z axis is discarded.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 14-Apr-2026 - Version 1.0.0
# - Initial release.
#
# 14-Apr-2026 - Version 1.1.0
# - Replaced hardcoded output path with UI.savepanel file dialog.
# - Switched constants to local variables to fix SketchUp eval context error.
#
# 14-Apr-2026 - Version 1.2.0
# - Full-document export with ValeSpec__HardwareItemData placeholders (keys only).
# - Custom JSON pretty-print to match ValeSpec file indentation (not 2-space-only).
#
# 14-Apr-2026 - Version 1.3.0
# - HardwareItem schema: removed HardwareItem__Image; SvgUrl renamed to HardwareItem__DataFile.
# - Placeholders added: HardwareItem__Notes, HardwareItem__SupplierProductCode.
#
# 14-Apr-2026 - Version 1.4.0
# - Each Paths[] entry includes VertexName (default empty) for future dynamic dimensions.
#
# 14-Apr-2026 - Version 1.5.0
# - JSON output uses space-before-colon + per-object key column width (legible layout).
#
# =============================================================================


# -----------------------------------------------------------------------------
# REGION | Coordinate & Unit Conversion Helpers
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Convert a SketchUp Point3d to a Local MM Coordinate Hash
    # ---------------------------------------------------------------
    # Returns { "X" => float_mm, "Y" => float_mm } relative to the origin point.
    # Z axis is intentionally discarded - all geometry is treated as 2D XY.
    def vale_pt_mm(pt, origin)
        inch_to_mm  =  25.4
        {
            "X"  =>  ((pt.x - origin.x) * inch_to_mm).round(3),
            "Y"  =>  ((pt.y - origin.y) * inch_to_mm).round(3)
        }
    end
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Selection Processing & Validation
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Validate Selection and Locate the Origin Group
    # ---------------------------------------------------------------
    # Looks for a Sketchup::Group with name or tag equal to "00__OriginPoint".
    # Returns [origin_group, nil] on success, or [nil, error_string] on failure.
    def vale_validate_selection(selection)
        return nil, "Nothing selected. Select loose edges + the 00__OriginPoint group." if selection.empty?

        origin_group = selection.find do |e|
            e.is_a?(Sketchup::Group) &&
            (e.name == "00__OriginPoint" || (e.respond_to?(:layer) && e.layer.name == "00__OriginPoint"))
        end

        return nil, "No group named/tagged '00__OriginPoint' found in selection." unless origin_group

        [origin_group, nil]  # <-- Return group and nil error on success
    end
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Geometry Extraction & Classification
# -----------------------------------------------------------------------------

    # SUB FUNCTION | Extract Arc and Circle Curves from the Edge List
    # ---------------------------------------------------------------
    # Iterates edges, detects ArcCurve membership, and builds arc data hashes.
    # Each arc is processed once regardless of how many segments make it up.
    # Arc angles are converted from SketchUp's arc-local space to world-space degrees.
    # Returns [arcs_array, seen_curve_ids_hash].
    def vale_extract_arcs(edges, origin_pt)
        inch_to_mm   =  25.4
        seen_curves  =  {}
        arcs         =  []

        edges.each do |edge|
            curve  =  edge.curve
            next unless curve.is_a?(Sketchup::ArcCurve)   # <-- Skip non-arc edges
            next if seen_curves[curve.object_id]           # <-- Skip already-processed curves
            seen_curves[curve.object_id] = true

            ctr_mm     =  vale_pt_mm(curve.center, origin_pt)
            radius_mm  =  (curve.radius * inch_to_mm).round(3)
            is_circle  =  curve.circular?

            # ArcCurve angles are measured from the curve's own xaxis, not world X.
            # Compute xaxis world angle then offset start/end to get world-space values.
            xaxis            =  curve.xaxis
            xaxis_angle_rad  =  Math.atan2(xaxis.y, xaxis.x)   # <-- Arc xaxis angle in world XY plane
            start_ang_rad    =  xaxis_angle_rad + curve.start_angle
            end_ang_rad      =  xaxis_angle_rad + curve.end_angle

            # Guard: SketchUp 2017 bug can return end_angle > 2*PI for circles
            if is_circle && (end_ang_rad - start_ang_rad) > (2 * Math::PI + 0.001)
                end_ang_rad = start_ang_rad + (2 * Math::PI)    # <-- Clamp to exactly 360 degrees
            end

            start_deg   =  (start_ang_rad * 180.0 / Math::PI).round(3)
            end_deg     =  (end_ang_rad   * 180.0 / Math::PI).round(3)
            sweep_deg   =  (end_deg - start_deg).round(3)

            start_pt_mm  =  vale_pt_mm(curve.edges.first.start.position, origin_pt)  # <-- Arc start point
            end_pt_mm    =  vale_pt_mm(curve.edges.last.end.position,    origin_pt)  # <-- Arc end point

            arcs << {
                "PathType"        =>  is_circle ? "Circle" : "Arc",
                "VertexName"      =>  "",
                "Center_mm"       =>  ctr_mm,
                "Radius_mm"       =>  radius_mm,
                "StartAngle_deg"  =>  start_deg,
                "EndAngle_deg"    =>  end_deg,
                "Sweep_deg"       =>  sweep_deg,
                "StartPoint_mm"   =>  start_pt_mm,
                "EndPoint_mm"     =>  end_pt_mm,
                "IsCircle"        =>  is_circle
            }
        end

        [arcs, seen_curves]  # <-- Return arc data and processed curve id set
    end
    # ---------------------------------------------------------------


    # SUB FUNCTION | Extract Straight Line Segments from the Edge List
    # ---------------------------------------------------------------
    # Processes all edges that do not belong to an already-handled ArcCurve.
    # Each qualifying edge becomes one Line entry with Start_mm and End_mm.
    # Returns an array of line data hashes.
    def vale_extract_lines(edges, origin_pt, arc_curve_ids)
        lines  =  []

        edges.each do |edge|
            curve  =  edge.curve
            next if curve.is_a?(Sketchup::ArcCurve) && arc_curve_ids[curve.object_id]  # <-- Skip arc edges

            lines << {
                "PathType"      =>  "Line",
                "VertexName"    =>  "",
                "Start_mm"      =>  vale_pt_mm(edge.start.position, origin_pt),
                "End_mm"        =>  vale_pt_mm(edge.end.position,   origin_pt)
            }
        end

        lines
    end
    # ---------------------------------------------------------------


    # SUB FUNCTION | Calculate the Tight Bounding Box Across All Extracted Paths
    # ---------------------------------------------------------------
    # Collects all X/Y extremes from line endpoints and arc extents.
    # Arc bounding boxes are computed conservatively using center +/- radius.
    # Returns a hash with MinX, MaxX, MinY, MaxY, Width, Height all in mm.
    def vale_calc_bbox(arcs, lines)
        xs  =  []
        ys  =  []

        lines.each do |l|
            xs  <<  l["Start_mm"]["X"]  <<  l["End_mm"]["X"]
            ys  <<  l["Start_mm"]["Y"]  <<  l["End_mm"]["Y"]
        end

        arcs.each do |a|
            r   =  a["Radius_mm"]
            cx  =  a["Center_mm"]["X"]
            cy  =  a["Center_mm"]["Y"]
            xs  <<  (cx - r)  <<  (cx + r)   # <-- Conservative arc extent (full circle bounds)
            ys  <<  (cy - r)  <<  (cy + r)
        end

        return {} if xs.empty?

        min_x  =  xs.min.round(3)
        max_x  =  xs.max.round(3)
        min_y  =  ys.min.round(3)
        max_y  =  ys.max.round(3)

        {
            "MinX_mm"    =>  min_x,
            "MaxX_mm"    =>  max_x,
            "MinY_mm"    =>  min_y,
            "MaxY_mm"    =>  max_y,
            "Width_mm"   =>  (max_x - min_x).round(3),
            "Height_mm"  =>  (max_y - min_y).round(3)
        }
    end
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | JSON Assembly & File Export
# -----------------------------------------------------------------------------

    # NOTE | Key lines use padded keys + " : " for column alignment (see Example JSON).
    # -----------------------------------------------------------------------------

    # HELPER FUNCTION | Line Indent for ValeSpec JSON (matches example file)
    # ---------------------------------------------------------------
    # Depth 1 => 2 spaces; depth 2 => 4; depth >= 3 => 4 * (depth - 1).
    def vale_spec_indent_line(line_depth)
        return  ''  if line_depth < 1
        return  '  '  if line_depth == 1
        ' ' * (4 * (line_depth - 1))
    end
    # ---------------------------------------------------------------


    # HELPER FUNCTION | JSON Scalar Fragment (null, bool, number, string)
    # ---------------------------------------------------------------
    def vale_spec_json_scalar_fragment(value)
        case value
        when NilClass   then 'null'
        when TrueClass  then 'true'
        when FalseClass then 'false'
        when String     then value.to_json
        when Integer    then value.to_json
        when Float
            value.nan? || value.infinite? ? 'null' : value.to_json
        else
            value.to_json
        end
    end
    # ---------------------------------------------------------------


    # HELPER FUNCTION | Padded JSON Key + Space-Colon (column-aligned, legible)
    # ---------------------------------------------------------------
    def vale_spec_key_colon_padded(key, key_column_width)
        kjs  =  key.to_json
        pad  =  [0, key_column_width - kjs.length].max
        "#{kjs}#{' ' * pad} : "
    end
    # ---------------------------------------------------------------


    # SUB FUNCTION | Format One Key-Value Pair at a Given Line Depth
    # ---------------------------------------------------------------
    def vale_spec_format_key_value_pair(key, value, key_line_depth, key_column_width)
        ind  =  vale_spec_indent_line(key_line_depth)
        kcol =  vale_spec_key_colon_padded(key, key_column_width)

        case value
        when Hash
            return  "#{ind}#{kcol}{}"  if value.empty?
            body  =  vale_spec_format_object_body(value, key_line_depth + 1)
            close =  vale_spec_indent_line(key_line_depth)
            "#{ind}#{kcol}{\n#{body}\n#{close}}"
        when Array
            return  "#{ind}#{kcol}[]"  if value.empty?
            inner  =  vale_spec_format_array_body(value, key_line_depth)
            "#{ind}#{kcol}[\n#{inner}\n#{ind}]"
        else
            "#{ind}#{kcol}#{vale_spec_json_scalar_fragment(value)}"
        end
    end
    # ---------------------------------------------------------------


    # SUB FUNCTION | Format Object Interior (comma-separated key lines)
    # ---------------------------------------------------------------
    def vale_spec_format_object_body(hash, inner_key_line_depth)
        return  ''  if hash.empty?
        width  =  hash.keys.map { |k| k.to_json.length }.max
        pairs  =  []
        hash.each do |k, v|
            pairs << vale_spec_format_key_value_pair(k, v, inner_key_line_depth, width)
        end
        pairs.join(",\n")
    end
    # ---------------------------------------------------------------


    # SUB FUNCTION | Format Array Body (objects / scalars)
    # ---------------------------------------------------------------
    def vale_spec_format_array_body(arr, parent_key_line_depth)
        elem_open_depth  =  parent_key_line_depth + 1
        chunks           =  arr.map { |el| vale_spec_format_array_element(el, elem_open_depth) }
        chunks.join(",\n")
    end
    # ---------------------------------------------------------------


    # SUB FUNCTION | Format One Array Element
    # ---------------------------------------------------------------
    def vale_spec_format_array_element(element, elem_line_depth)
        case element
        when Hash
            return  "#{vale_spec_indent_line(elem_line_depth)}{}"  if element.empty?
            body  =  vale_spec_format_object_body(element, elem_line_depth + 1)
            open  =  vale_spec_indent_line(elem_line_depth)
            "#{open}{\n#{body}\n#{open}}"
        else
            "#{vale_spec_indent_line(elem_line_depth)}#{vale_spec_json_scalar_fragment(element)}"
        end
    end
    # ---------------------------------------------------------------


    # FUNCTION | Build Placeholder ValeSpec__HardwareItemData Hash (keys retained)
    # ---------------------------------------------------------------
    def vale_spec_empty_hardware_item_data_hash
        {
            "HardwareItem__Name"                   =>  "",
            "HardwareItem__Code"                   =>  "",
            "HardwareItem__Type"                   =>  "",
            "HardwareItem__Description"            =>  "",
            "HardwareItem__Notes"                  =>  "",
            "HardwareItem__DataFile"               =>  "",
            "HardwareItem__IsComplementary"        =>  false,
            "HardwareItem__Supplier"               =>  "",
            "HardwareItem__SupplierProductCode"    =>  "",
            "HardwareItem__SupplierPrice__GBP"     =>  "",
            "HardwareItem__PanelPlacement"         =>  {
                "DefaultHeightFromOrigin_mm"  =>  nil,
                "RightHand__Transform"        =>  {
                    "OffsetX_mm"  =>  nil,
                    "OffsetY_mm"  =>  nil,
                    "ScaleX"      =>  nil
                },
                "LeftHand__Transform"         =>  {
                    "OffsetX_mm"  =>  nil,
                    "OffsetY_mm"  =>  nil,
                    "ScaleX"      =>  nil
                }
            },
            "HardwareItem__AvailableFinishes"    =>  []
        }
    end
    # ---------------------------------------------------------------


    # FUNCTION | Serialize Full Root Hash to ValeSpec-Indented JSON String
    # ---------------------------------------------------------------
    def vale_spec_generate_full_document_json(root_hash)
        width  =  root_hash.keys.map { |k| k.to_json.length }.max
        parts  =  []
        root_hash.each do |k, v|
            parts << vale_spec_format_key_value_pair(k, v, 1, width)
        end
        "{\n#{parts.join(",\n")}\n}\n"
    end
    # ---------------------------------------------------------------


    # FUNCTION | ValeSpec CAD Object JSON Exporter - Main Entry Point
    # ---------------------------------------------------------------
    def vale_export_cad_object

        model      =  Sketchup.active_model
        selection  =  model.selection.to_a

        # Validate selection and resolve origin group
        origin_group, error  =  vale_validate_selection(selection)
        if error
            puts "\n!! ValeSpec Exporter : #{error}"
            return
        end

        # Resolve world-space origin from the bounding box centre of the origin group
        origin_pt  =  origin_group.bounds.center
        puts "\n>> Origin found  : #{origin_pt.x.round(4)}\", #{origin_pt.y.round(4)}\", #{origin_pt.z.round(4)}\" (inches)"

        # Collect loose edges only - the origin group itself is excluded
        loose_edges  =  selection.select { |e| e.is_a?(Sketchup::Edge) }
        puts ">> Loose edges   : #{loose_edges.size}"

        # Classify geometry into arcs and straight lines
        arcs, arc_curve_ids  =  vale_extract_arcs(loose_edges, origin_pt)
        lines                =  vale_extract_lines(loose_edges, origin_pt, arc_curve_ids)
        bbox                 =  vale_calc_bbox(arcs, lines)

        arc_edge_count       =  loose_edges.count { |e| e.curve.is_a?(Sketchup::ArcCurve) }
        straight_edge_count  =  loose_edges.size - arc_edge_count

        puts ">> Arcs/Circles  : #{arcs.size}  (from #{arc_edge_count} arc edges)"
        puts ">> Line segments : #{lines.size} (from #{straight_edge_count} straight edges)"

        # Assemble full document: placeholder metadata + vector data from the model
        all_paths     =  arcs + lines
        vector_block  =  {
            "OriginNote"    =>  "Local 0,0 = centre of 00__OriginPoint group (e.g. handle spindle). Right-hand orientation.",
            "CoordSystem"   =>  "XY plane | X=right, Y=up | Units=mm | Z discarded",
            "BoundingBox"   =>  bbox,
            "EdgeCount"     =>  loose_edges.size,
            "ArcCount"      =>  arcs.size,
            "LineCount"     =>  lines.size,
            "Paths"         =>  all_paths
        }

        full_document  =  {
            "ValeSpec__HardwareItemData"  =>  vale_spec_empty_hardware_item_data_hash(),
            "HardwareItem__VectorData"    =>  vector_block
        }

        require 'json'
        json_str  =  vale_spec_generate_full_document_json(full_document)

        # Print to Ruby Console
        puts "\n" + ("=" * 70)
        puts "VALESPEC | CAD OBJECT BUILDER - JSON OUTPUT"
        puts "=" * 70
        puts json_str
        puts "=" * 70

        # Open OS Save dialog - default filename pre-filled, user can rename
        output_path  =  UI.savepanel(
            "Save ValeSpec Hardware Object JSON",
            "",
            "ValeSpec__HardwareObject__.json"
        )

        if output_path.nil?
            puts "\n>> Save cancelled. Copy the JSON from the console above."
            return
        end

        # Write to the chosen file path
        begin
            File.open(output_path, "w") { |f| f.write(json_str) }
            puts "\n>> Saved to : #{output_path}"
        rescue => file_err
            puts "\n!! File write failed : #{file_err.message}"
            puts "   (Copy the JSON from the console above instead)"
        end

        puts "\n>> Export complete."

    end
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# Run immediately when pasted into the SketchUp Ruby Console (not plain ruby)
vale_export_cad_object if defined?(Sketchup)
