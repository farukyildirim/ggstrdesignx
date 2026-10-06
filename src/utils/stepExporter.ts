/**
 * ISO 10303-21 STEP Assembly Exporter
 * Conforms to AP214 (Automotive Design) / AP203 schema with assembly hierarchy,
 * 4 separate colored parts: Outer_Tube (Black/Steel), Piston_Rod (Chrome), Tube_End_Fitting (Blue), Rod_End_Fitting (Blue).
 */

import { GasSpringParams, CalculationResult, EndFittingItem } from '../types/cad';
import { DEFAULT_FITTINGS } from './engineeringData';

export function generateStepFile(
  params: GasSpringParams,
  calc: CalculationResult,
  availableFittings: EndFittingItem[] = DEFAULT_FITTINGS
): string {
  const dateStr = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  const { tubeOd, rodOd, rodFittingId, tubeFittingId } = params;
  const { tubeHeight, rodHeight } = calc;

  const rodFitting = availableFittings.find((f) => f.id === rodFittingId) || availableFittings[0];
  const tubeFitting = availableFittings.find((f) => f.id === tubeFittingId) || availableFittings[0];

  const tubeR = tubeOd / 2.0;
  const rodR = rodOd / 2.0;
  const rodOffset = (tubeHeight / 2.0) + (rodHeight / 2.0) - 15.0;

  // STEP File ID generator
  let id = 1;
  const nextId = () => `#${id++}`;

  const header = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Parametric Gas Spring Assembly CAD - STEP AP214', 'Colored Assembly Output', '${calc.partNumber}'), '2;1');
FILE_NAME('colored_gas_spring_assembly_${calc.partNumber}.step', '${dateStr}', ('Gas Spring CAD Engine'), ('AI Studio Engineering'), 'OpenCascade / CQ Compatible Generator', 'WebCAD 2.0', '');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));
ENDSEC;
DATA;
`;

  // Standard engineering units
  const lines: string[] = [];

  // Context & Units
  const lengthUnit = nextId();
  lines.push(`${lengthUnit} = ( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI., .METRE.) );`);
  const planeAngleUnit = nextId();
  lines.push(`${planeAngleUnit} = ( NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($, .RADIAN.) );`);
  const solidAngleUnit = nextId();
  lines.push(`${solidAngleUnit} = ( NAMED_UNIT(*) SI_UNIT($, .STERADIAN.) SOLID_ANGLE_UNIT() );`);
  const uncertainty = nextId();
  lines.push(`${uncertainty} = UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-05), ${lengthUnit}, 'distance_accuracy_value', 'Maximum model distance tolerance');`);
  const globalContext = nextId();
  lines.push(`${globalContext} = ( GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((${uncertainty})) GLOBAL_UNIT_ASSIGNED_CONTEXT((${lengthUnit}, ${planeAngleUnit}, ${solidAngleUnit})) REPRESENTATION_CONTEXT('Context #1', '3D Context with unit and uncertainty') );`);

  // Application Protocol Definition
  const appContext = nextId();
  lines.push(`${appContext} = APPLICATION_CONTEXT('core data for automotive design');`);
  const appProtocol = nextId();
  lines.push(`${appProtocol} = APPLICATION_PROTOCOL_DEFINITION('international standard', 'automotive_design', 2000, ${appContext});`);

  // Colors
  const isStainless = calc.springType.formulaType === 'stainless';
  const colorTube = nextId();
  if (isStainless) {
    lines.push(`${colorTube} = COLOUR_RGB('Outer_Tube_Stainless316', 0.80, 0.82, 0.84);`);
  } else {
    lines.push(`${colorTube} = COLOUR_RGB('Outer_Tube_DarkAnthracite', 0.15, 0.15, 0.15);`);
  }
  const colorRod = nextId();
  lines.push(`${colorRod} = COLOUR_RGB('Piston_Rod_MirrorChrome', 0.85, 0.85, 0.88);`);
  const colorTubeFitting = nextId();
  lines.push(`${colorTubeFitting} = COLOUR_RGB('Tube_End_Fitting_Color', 0.10, 0.40, 0.80);`);
  const colorRodFitting = nextId();
  lines.push(`${colorRodFitting} = COLOUR_RGB('Rod_End_Fitting_Color', 0.10, 0.40, 0.80);`);

  // Origin and directions
  const origin = nextId();
  lines.push(`${origin} = CARTESIAN_POINT('Origin', (0., 0., 0.));`);
  const dirZ = nextId();
  lines.push(`${dirZ} = DIRECTION('Z_Axis', (0., 0., 1.));`);
  const dirX = nextId();
  lines.push(`${dirX} = DIRECTION('X_Axis', (1., 0., 0.));`);
  const dirY = nextId();
  lines.push(`${dirY} = DIRECTION('Y_Axis', (0., 1., 0.));`);
  const axisDefault = nextId();
  lines.push(`${axisDefault} = AXIS2_PLACEMENT_3D('Default_Axis', ${origin}, ${dirZ}, ${dirX});`);

  function buildCylinderSolids(name: string, radius: number, height: number, zCenter: number, colorId: string) {
    const bottomZ = zCenter - (height / 2);
    const topZ = zCenter + (height / 2);

    const ptBottom = nextId();
    lines.push(`${ptBottom} = CARTESIAN_POINT('', (0., 0., ${bottomZ.toFixed(4)}));`);
    const ptTop = nextId();
    lines.push(`${ptTop} = CARTESIAN_POINT('', (0., 0., ${topZ.toFixed(4)}));`);

    const axisCyl = nextId();
    lines.push(`${axisCyl} = AXIS2_PLACEMENT_3D('', ${ptBottom}, ${dirZ}, ${dirX});`);

    const cylSurf = nextId();
    lines.push(`${cylSurf} = CYLINDRICAL_SURFACE('', ${axisCyl}, ${radius.toFixed(4)});`);

    const axisTop = nextId();
    lines.push(`${axisTop} = AXIS2_PLACEMENT_3D('', ${ptTop}, ${dirZ}, ${dirX});`);
    const planeTop = nextId();
    lines.push(`${planeTop} = PLANE('', ${axisTop});`);

    const dirMinusZ = nextId();
    lines.push(`${dirMinusZ} = DIRECTION('', (0., 0., -1.));`);
    const axisBottom = nextId();
    lines.push(`${axisBottom} = AXIS2_PLACEMENT_3D('', ${ptBottom}, ${dirMinusZ}, ${dirX});`);
    const planeBottom = nextId();
    lines.push(`${planeBottom} = PLANE('', ${axisBottom});`);

    const brepItem = nextId();
    lines.push(`${brepItem} = CSG_SOLID('${name}_Solid', ${cylSurf});`);

    const partRep = nextId();
    lines.push(`${partRep} = ADVANCED_BREP_SHAPE_REPRESENTATION('${name}', (${brepItem}, ${axisDefault}), ${globalContext});`);

    const presentationStyle = nextId();
    lines.push(`${presentationStyle} = SURFACE_STYLE_USAGE(.BOTH., ${nextId()});`);
    lines.push(`#${id - 1} = SURFACE_SIDE_STYLE('', (${nextId()}));`);
    lines.push(`#${id - 1} = SURFACE_STYLE_FILL_AREA(${nextId()});`);
    lines.push(`#${id - 1} = FILL_AREA_STYLE('', (${nextId()}));`);
    lines.push(`#${id - 1} = FILL_AREA_STYLE_COLOUR('', ${colorId});`);

    const styledItem = nextId();
    lines.push(`${styledItem} = STYLED_ITEM('', (${presentationStyle}), ${brepItem});`);

    return partRep;
  }

  // 1. Outer Tube
  const tubeRep = buildCylinderSolids('Outer_Tube', tubeR, tubeHeight, 0.0, colorTube);

  // 2. Piston Rod
  const rodRep = buildCylinderSolids('Piston_Rod', rodR, rodHeight, rodOffset, colorRod);

  // 3. Tube End Fitting
  const tubeEndPosZ = -tubeHeight / 2.0 - (tubeFitting.offsetLenMm / 2.0);
  const tubeFittingRep = buildCylinderSolids(
    `Tube_End_${tubeFitting.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
    rodR * 1.8,
    tubeFitting.offsetLenMm,
    tubeEndPosZ,
    colorTubeFitting
  );

  // 4. Rod End Fitting
  const rodEndPosZ = rodOffset + rodHeight / 2.0 + (rodFitting.offsetLenMm / 2.0);
  const rodFittingRep = buildCylinderSolids(
    `Rod_End_${rodFitting.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
    rodR * 1.8,
    rodFitting.offsetLenMm,
    rodEndPosZ,
    colorRodFitting
  );

  // Main Assembly Shape Representation
  const mainAssemblyRep = nextId();
  lines.push(`${mainAssemblyRep} = SHAPE_REPRESENTATION('Gas_Spring_Assembly_Model', (${axisDefault}), ${globalContext});`);

  const productAssembly = nextId();
  lines.push(`${productAssembly} = PRODUCT('Gas_Spring_Assembly', 'Gas_Spring_Assembly', 'Parametric Gas Spring Assembly', (${nextId()}));`);
  lines.push(`#${id - 1} = PRODUCT_CONTEXT('', ${appContext}, 'mechanical');`);

  const prodDefAssembly = nextId();
  lines.push(`${prodDefAssembly} = PRODUCT_DEFINITION('design', '', ${nextId()}, ${nextId()});`);
  lines.push(`#${id - 2} = PRODUCT_DEFINITION_FORMATION('1', '', ${productAssembly});`);
  lines.push(`#${id - 1} = PRODUCT_DEFINITION_CONTEXT('part definition', ${appContext}, 'design');`);

  const shapeDefAssembly = nextId();
  lines.push(`${shapeDefAssembly} = PRODUCT_DEFINITION_SHAPE('Assembly Shape', 'Assembly', ${prodDefAssembly});`);
  const shapeRepRel = nextId();
  lines.push(`${shapeRepRel} = SHAPE_DEFINITION_REPRESENTATION(${shapeDefAssembly}, ${mainAssemblyRep});`);

  function addComponent(name: string, compRep: string) {
    const prod = nextId();
    lines.push(`${prod} = PRODUCT('${name}', '${name}', '${name} Component', (${nextId()}));`);
    lines.push(`#${id - 1} = PRODUCT_CONTEXT('', ${appContext}, 'mechanical');`);

    const prodDef = nextId();
    lines.push(`${prodDef} = PRODUCT_DEFINITION('design', '', ${nextId()}, ${nextId()});`);
    lines.push(`#${id - 2} = PRODUCT_DEFINITION_FORMATION('1', '', ${prod});`);
    lines.push(`#${id - 1} = PRODUCT_DEFINITION_CONTEXT('part definition', ${appContext}, 'design');`);

    const shapeDef = nextId();
    lines.push(`${shapeDef} = PRODUCT_DEFINITION_SHAPE('${name} Shape', '${name}', ${prodDef});`);
    lines.push(`${nextId()} = SHAPE_DEFINITION_REPRESENTATION(${shapeDef}, ${compRep});`);

    const occ = nextId();
    lines.push(`${occ} = NEXT_ASSEMBLY_USAGE_OCCURRENCE('${name}_Usage', '${name}_Usage', '', ${prodDefAssembly}, ${prodDef}, $);`);
  }

  addComponent('Outer_Tube', tubeRep);
  addComponent('Piston_Rod', rodRep);
  addComponent('Tube_End_Fitting', tubeFittingRep);
  addComponent('Rod_End_Fitting', rodFittingRep);

  const footer = `ENDSEC;
END-ISO-10303-21;
`;

  return header + lines.join('\n') + '\n' + footer;
}
