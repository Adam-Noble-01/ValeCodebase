# =============================================================================
# VALESPEC - CAD OBJECT BUILDER - SKETCHUP JSON EXPORTER
# =============================================================================
#
# FILE    : ValeSpec__CadObjectBuilder__JsonExporter__.rb
# AUTHOR  : Adam Noble - Noble Architecture
# PURPOSE : Export selected SketchUp 2D geometry to structured JSON for the
#           ValeSpec HardwareIndex. Produces a HardwareItem__VectorData block
#           ready to paste into ValeSpec__Data__HardwareIndex__.json.
# CREATED : Apr-2026
#
# DESCRIPTION:
# - Select all loose edges (2D linework) plus the 00__OriginPoint group.
# - Paste this script into the SketchUp Ruby Console and press Enter.
# - A Save dialog appears. Default filename is pre-filled; edit if needed.
# - The JSON is printed to the console AND written to the chosen file path.
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
                "PathType"  =>  "Line",
                "Start_mm"  =>  vale_pt_mm(edge.start.position, origin_pt),
                "End_mm"    =>  vale_pt_mm(edge.end.position,   origin_pt)
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

        # Assemble the HardwareItem__VectorData output block
        all_paths    =  arcs + lines
        vector_data  =  {
            "HardwareItem__VectorData"  =>  {
                "OriginNote"    =>  "Local 0,0 = centre of 00__OriginPoint group (e.g. handle spindle). Right-hand orientation.",
                "CoordSystem"   =>  "XY plane | X=right, Y=up | Units=mm | Z discarded",
                "BoundingBox"   =>  bbox,
                "EdgeCount"     =>  loose_edges.size,
                "ArcCount"      =>  arcs.size,
                "LineCount"     =>  lines.size,
                "Paths"         =>  all_paths
            }
        }

        # Serialize to formatted JSON
        require 'json'
        json_str  =  JSON.pretty_generate(vector_data)

        # Print to Ruby Console
        puts "\n" + ("=" * 70)
        puts "VALESPEC | CAD OBJECT BUILDER - JSON OUTPUT"
        puts "=" * 70
        puts json_str
        puts "=" * 70

        # Open OS Save dialog - default filename pre-filled, user can rename
        output_path  =  UI.savepanel(
            "Save ValeSpec Vector Data",
            "",
            "ValeSpec__CadObject__VectorData__.json"
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


# Run immediately on paste
vale_export_cad_object
