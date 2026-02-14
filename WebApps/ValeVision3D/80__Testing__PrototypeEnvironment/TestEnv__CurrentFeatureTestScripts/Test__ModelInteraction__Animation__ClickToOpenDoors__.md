# NEW FEATURE |  Click to Open Doors
# ---------------------------------------------------------
- Build a script to animate the doors in the model when the user clicks on them.
- Use `Test__ModelInteraction__Animation__ClickToOpenDoors__.js` for the base functionality.
- Call it as needed into the Test Environment System.


## Feature Behaviour
## --------------------------------------------------------
- User Clicks on a door.
- The door is animated to open.
 - It rotates around the hinge centre by the Degrees Value define in the object string as shown below.
 - It animates smoothly over the duration of the animation.
- User Clicks on a door again to close the door.
- The door is animated to close which is back to the original position.
- It animates smoothly over the duration of the animation.
- The user can click on the door again to open or close the door effectively toggling the door state.

## MODEL STRUCTURE
## --------------------------------------------------------

```GlbSceneGraphStructure
👁 [Group] DoorTestFile__Moore__ValeVision__MainBuildingModel__Existing__MeshModel__  <-- Root Group
└─ 👁 [Object3D] (unnamed Object3D)  <-- Root Object3D
   └─ 👁 [Object3D] Assembly-14  <-- Assembly Object3D
      └─ 👁 [Object3D] ADR002__InternalDoor__GroundFloor__PorchToLounge  <-- Door Assembly
         |
         ├─ 👁 [Object3D] MOD001__ROT__90-Deg__DoorPanel  <-- Door Panel Modifier
         │  ├─ 👁 [Object3D] (unnamed Object3D)
         │  │  └─ 👁 [Mesh] Geom3D_
         │  ├─ 👁 [Object3D] (unnamed Object3D)
         │  │  ├─ 👁 [Object3D] (unnamed Object3D)
         │  │  │  └─ 👁 [Mesh] Geom3D__1
         │  │  ├─ 👁 [Object3D] (unnamed Object3D)
         │  │  │  └─ 👁 [Mesh] Geom3D__2
         │  │  └─ 👁 [Object3D] (unnamed Object3D)
         │  │     └─ 👁 [Mesh] Geom3D__3
         │  └─ 👁 [Object3D] (unnamed Object3D)
         │     ├─ 👁 [Object3D] (unnamed Object3D)
         │     │  └─ 👁 [Mesh] Geom3D__4
         │     ├─ 👁 [Object3D] (unnamed Object3D)
         │     │  └─ 👁 [Mesh] Geom3D__5
         │     └─ 👁 [Object3D] (unnamed Object3D)
         │        └─ 👁 [Mesh] Geom3D__6
         |
         └─ 👁 [Object3D] ROT001__RotationPoint__DoorHingeCentre
```
`

## GLOSSARY OF CODE NAMES AND TERMS
## --------------------------------------------------------

`ADR` = "A Door" Example, These are door assemblies in the model. 
  - Example: `ADR002__InternalDoor__GroundFloor__PorchToLounge`
  - Tge 3 Digit code is the unique identifier for the door.
  - The "__" Delimits the namespace for the door Assembly for efficient targeting of the doors in the scene graph.


`MOD` = "A Modifier" Example, These are modifier objects in the model.
  - Example: `MOD001__ROT__90-Deg__DoorPanel`
  - The 3 Digit code IS NOT UNIQUE, its just to pad out the code to 3 digits for consistency, the digits may change arbitrarily.
  - The "__" Delimits the namespace for the modifier object for efficient targeting of the modifier objects in the scene graph.
  - The "ROT" is the type of modifier, in this case a rotation modifier.
  - The "90-Deg" is the amount of rotation to apply to the door panel.
  - The "DoorPanel" is the name of the container object to be rotated, in this case it contains the meshes that make up the door panel and door handles (x2) and other objects that need to be rotated along with the door panel when the door is opened or closed. this objects naming is arbitrary and can be changed arbitrarily.

`ROT` = "Rotation Point" Example, These are the rotation points for the doors in the model.
  - Example: `ROT001__RotationPoint__DoorHingeCentre`
  - The 3 Digit code IS NOT UNIQUE, its just to pad out the code to 3 digits for consistency, the digits may change arbitrarily.
  - The "ROT" is the type of rotation point, in this case a rotation point for the door hinge centre.   
  - The "__" Delimits the namespace for the rotation point for efficient targeting of the rotation points in the scene graph.
  - The "RotationPoint"  and "DoorHingeCentre" are the names of the rotation point and the door hinge centre, but are arbitrary names and can be changed arbitrarily.



## FUTURE IMPROVEMENTS LIST
## --------------------------------------------------------
*Implement these after the base functionality is working as expected.*
- Proximity Sensor to open the doors when the user is within a certain distance of the door.
