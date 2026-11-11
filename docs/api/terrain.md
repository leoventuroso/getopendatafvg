# Terrain and coverage

::: getopendatafvg.dem
    options:
      members:
        - DemSampler
        - compute_line_grade
        - compute_line_slope
        - slope_class_for_value

::: getopendatafvg.coverage
    options:
      members:
        - build_coverage_union
        - line_coverage_pct
