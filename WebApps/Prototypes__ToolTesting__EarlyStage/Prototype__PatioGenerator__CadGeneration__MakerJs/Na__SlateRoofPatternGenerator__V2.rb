# ============================================================
# Noble Architecture - UK Slate Roof Pattern Generator
# V2: removes internal centre-tail lines and sets requested defaults.
#
# Usage:
# 1. Select one or more roof plane faces in the active SketchUp context.
# 2. Paste this full file into the Ruby Console, or run:
#    load "C:/Path/Na__SlateRoofPatternGenerator__V2.rb"
#
# Result:
# - Each selected face is treated as a local 2D slate canvas.
# - One reusable slate outline component is created.
# - Component instances are arrayed over each selected face.
# - Each roof plane receives its own containing group.
# ============================================================

module Na__SlateRoofPatternGenerator
  Na__SlatePreset = Struct.new(:name, :length_mm, :width_mm, :headlap_mm)

  PRESETS = [
    Na__SlatePreset.new("Natural slate 600 x 300 - 100mm headlap", 600, 300, 100),
    Na__SlatePreset.new("Natural slate 500 x 300 - 100mm headlap", 500, 300, 100),
    Na__SlatePreset.new("Natural slate 500 x 250 - 100mm headlap", 500, 250, 100),
    Na__SlatePreset.new("Natural slate 460 x 220 - 80mm headlap", 460, 220, 80),
    Na__SlatePreset.new("Natural slate 400 x 250 - 75mm headlap", 400, 250, 75),
    Na__SlatePreset.new("Custom - use manual size fields below", 500, 250, 100)
  ].freeze

  SAFE_POINT_CLASSES = [
    Sketchup::Face::PointInside,
    Sketchup::Face::PointOnFace,
    Sketchup::Face::PointOnEdge,
    Sketchup::Face::PointOnVertex
  ].freeze

  WORLD_UP = Geom::Vector3d.new(0, 0, 1).freeze

  def self.run
    model = Sketchup.active_model
    faces = na__selection__direct_faces(model.selection)

    if faces.empty?
      UI.messagebox("Select one or more roof plane faces first, then run the script again.")
      return
    end

    options = na__dialog__read_options
    return unless options

    slate_length = options[:slate_length]
    slate_width  = options[:slate_width]
    headlap      = options[:headlap]
    side_gap     = options[:side_gap]
    lift         = options[:lift]
    stagger      = options[:stagger]

    visible_gauge = (slate_length - headlap) / 2.0

    if visible_gauge <= 0
      UI.messagebox("Invalid slate settings. Headlap must be smaller than slate length.")
      return
    end

    if slate_width <= 0 || slate_length <= 0
      UI.messagebox("Invalid slate settings. Slate width and length must be greater than zero.")
      return
    end

    model.start_operation("Generate UK Slate Roof Pattern", true)

    begin
      tag = na__model__ensure_tag(model, "NA_Slate_Roof_Patterns")
      slate_definition = na__component__build_slate_definition(
        model,
        slate_width,
        visible_gauge
      )

      total_instances = 0

      faces.each_with_index do |face, index|
        parent_group = model.active_entities.add_group
        parent_group.name = "NA Slate Roof Pattern - Face #{index + 1}"
        parent_group.layer = tag if tag

        count = na__face__populate_with_slates(
          parent_group.entities,
          slate_definition,
          face,
          slate_width,
          visible_gauge,
          side_gap,
          lift,
          stagger,
          tag
        )

        total_instances += count
      end

      model.commit_operation

      UI.messagebox(
        "Slate roof pattern complete.\n\n" \
        "Selected faces: #{faces.length}\n" \
        "Slate instances: #{total_instances}\n" \
        "Visible gauge: #{na__length__format_mm(visible_gauge)}\n" \
        "Slate size used: #{na__length__format_mm(slate_length)} x #{na__length__format_mm(slate_width)}\n" \
        "Headlap used: #{na__length__format_mm(headlap)}"
      )
    rescue => error
      model.abort_operation
      UI.messagebox("Slate roof pattern failed:\n\n#{error.class}: #{error.message}")
      puts error.backtrace.join("\n")
    end
  end

  def self.na__selection__direct_faces(selection)
    selection.grep(Sketchup::Face).select { |face| face.valid? && !face.deleted? }
  end

  def self.na__dialog__read_options
    preset_names = PRESETS.map(&:name)
    preset_list = preset_names.join("|")

    prompts = [
      "Slate preset",
      "Custom slate length in mm",
      "Custom slate width in mm",
      "Headlap in mm",
      "Side gap between slates in mm",
      "Lift linework off face in mm",
      "Half bond stagger alternate courses?"
    ]

    defaults = [
      PRESETS[2].name,
      "500",
      "250",
      "100",
      "0",
      "0",
      "Yes"
    ]

    lists = [
      preset_list,
      "",
      "",
      "",
      "",
      "",
      "Yes|No"
    ]

    input = UI.inputbox(prompts, defaults, lists, "NA UK Slate Roof Pattern Generator")
    return nil unless input

    preset_name = input[0].to_s
    preset = PRESETS.find { |item| item.name == preset_name } || PRESETS[2]

    if preset.name.start_with?("Custom")
      slate_length = na__length__mm(input[1])
      slate_width  = na__length__mm(input[2])
    else
      slate_length = preset.length_mm.mm
      slate_width  = preset.width_mm.mm
    end

    headlap = input[3].to_s.strip.empty? ? preset.headlap_mm.mm : na__length__mm(input[3])

    {
      slate_length: slate_length,
      slate_width: slate_width,
      headlap: headlap,
      side_gap: na__length__mm(input[4]),
      lift: na__length__mm(input[5]),
      stagger: input[6].to_s.downcase.start_with?("y")
    }
  end

  def self.na__length__mm(value)
    return value if defined?(Length) && value.is_a?(Length)

    text = value.to_s.strip
    return 0.mm if text.empty?

    numeric = text.gsub(/[^\d\.\-]/, "").to_f
    numeric.mm
  end

  def self.na__length__format_mm(length)
    "#{(length.to_f / 1.mm).round}mm"
  end

  def self.na__model__ensure_tag(model, tag_name)
    # SketchUp still exposes Tags through model.layers in the Ruby API.
    model.layers.add(tag_name)
  rescue
    nil
  end

  def self.na__component__build_slate_definition(model, slate_width, visible_gauge)
    name = "NA_Slate_#{na__length__format_mm(slate_width)}x#{na__length__format_mm(visible_gauge)}_Visible"
    definition = model.definitions.add(name)

    entities = definition.entities

    p0 = Geom::Point3d.new(0, 0, 0)
    p1 = Geom::Point3d.new(slate_width, 0, 0)
    p2 = Geom::Point3d.new(slate_width, visible_gauge, 0)
    p3 = Geom::Point3d.new(0, visible_gauge, 0)

    entities.add_line(p0, p1)
    entities.add_line(p1, p2)
    entities.add_line(p2, p3)
    entities.add_line(p3, p0)

    # Keep each slate as a clean visible rectangle only.
    # Do not add centre-tail/detail lines, because they read as unwanted over-extending marks
    # when the half-bond rows are arrayed over a roof plane.

    definition
  end

  def self.na__face__populate_with_slates(parent_entities, definition, face, slate_width, visible_gauge, side_gap, lift, stagger, tag)
    basis = na__face__build_basis(face)
    return 0 unless basis

    origin = basis[:origin]
    x_axis = basis[:x_axis]
    y_axis = basis[:y_axis]
    z_axis = basis[:z_axis]

    local_vertices = face.outer_loop.vertices.map do |vertex|
      na__point__to_local_2d(vertex.position, origin, x_axis, y_axis)
    end

    min_x, max_x = local_vertices.map(&:first).minmax
    min_y, max_y = local_vertices.map(&:last).minmax

    x_step = slate_width + side_gap
    y_step = visible_gauge

    # Overscan gives the staggered alternate rows enough width to test against clipped roof edges.
    start_x = min_x - x_step
    end_x   = max_x + x_step
    start_y = min_y
    end_y   = max_y

    count = 0
    course_index = 0
    y = start_y

    while y <= end_y
      row_offset = (stagger && course_index.odd?) ? -(x_step / 2.0) : 0.mm
      x = start_x + row_offset

      while x <= end_x
        local_corners = [
          [x, y],
          [x + slate_width, y],
          [x + slate_width, y + visible_gauge],
          [x, y + visible_gauge]
        ]

        if na__face__slate_fits?(face, local_corners, origin, x_axis, y_axis)
          placement_origin = origin.offset(x_axis, x).offset(y_axis, y).offset(z_axis, lift)
          transform = Geom::Transformation.axes(placement_origin, x_axis, y_axis, z_axis)

          instance = parent_entities.add_instance(definition, transform)
          instance.name = "NA Slate Outline"
          instance.layer = tag if tag

          count += 1
        end

        x += x_step
      end

      y += y_step
      course_index += 1
    end

    count
  end

  def self.na__face__build_basis(face)
    normal = face.normal
    return nil if normal.length < 0.001

    normal = Geom::Vector3d.new(normal.x, normal.y, normal.z)
    normal.normalize!

    # Prefer the visible/top side for the small lift offset.
    normal.reverse! if normal.z < 0

    dot = WORLD_UP.dot(normal)
    normal_projection_on_up = Geom::Vector3d.new(
      normal.x * dot,
      normal.y * dot,
      normal.z * dot
    )

    up_slope = Geom::Vector3d.new(
      WORLD_UP.x - normal_projection_on_up.x,
      WORLD_UP.y - normal_projection_on_up.y,
      WORLD_UP.z - normal_projection_on_up.z
    )

    if up_slope.length < 0.001
      # Near-horizontal face. Fall back to the longest outer-loop edge for X and derive Y.
      x_axis = na__face__longest_outer_edge_vector(face)
      return nil unless x_axis && x_axis.length >= 0.001

      x_axis.normalize!
      y_axis = normal.cross(x_axis)
      y_axis.normalize!
    else
      up_slope.normalize!
      y_axis = up_slope
      x_axis = y_axis.cross(normal)
      x_axis.normalize!
    end

    z_axis = normal
    origin = face.outer_loop.vertices.first.position

    {
      origin: origin,
      x_axis: x_axis,
      y_axis: y_axis,
      z_axis: z_axis
    }
  end

  def self.na__face__longest_outer_edge_vector(face)
    longest = face.outer_loop.edges.max_by { |edge| edge.length }
    return nil unless longest

    longest.end.position - longest.start.position
  end

  def self.na__point__to_local_2d(point, origin, x_axis, y_axis)
    vector = point - origin
    [vector.dot(x_axis), vector.dot(y_axis)]
  end

  def self.na__point__from_local_2d(x, y, origin, x_axis, y_axis)
    origin.offset(x_axis, x).offset(y_axis, y)
  end

  def self.na__face__slate_fits?(face, local_corners, origin, x_axis, y_axis)
    local_corners.all? do |x, y|
      point = na__point__from_local_2d(x, y, origin, x_axis, y_axis)
      SAFE_POINT_CLASSES.include?(face.classify_point(point))
    end
  end
end

Na__SlateRoofPatternGenerator.run
