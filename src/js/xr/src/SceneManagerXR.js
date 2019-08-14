const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree, useRender } = require('react-three-fiber')

const { connect, useStore, Provider } = require('react-redux')
const { useMemo, useState, useEffect, useRef } = React = require('react')

const { WEBVR } = require('three/examples/jsm/vr/WebVR')

const {
  getSceneObjects,
  getWorld,
  getActiveCamera
} = require('../../shared/reducers/shot-generator')

const useRStats = require('./hooks/use-rstats')
const FPSMeter = require('./components/FPSMeter')

const SDFText = require('datguivr/modules/datguivr/sdftext')
const textCreator = SDFText.creator()

const HUD = ({ position, children }) => {
  return (
    <group position={position}>
      {children}
    </group>
  )
}

const SceneContent = connect(
  state => ({
    sceneObjects: getSceneObjects(state),
    world: getWorld(state),
    activeCamera: getActiveCamera(state)
  })
)(
  ({
    sceneObjects,
    world,
    activeCamera
  }) => {
    const { camera } = useThree()

    const [teleportPos, setTeleportPos] = useState(null)
    const [teleportRot, setTeleportRot] = useState(null)

    // initialize behind the camera, on the floor
    useMemo(() => {
      const { x, y, rotation } = sceneObjects[activeCamera]

      const behindCam = {
        x: Math.sin(rotation),
        y: Math.cos(rotation)
      }

      setTeleportPos(new THREE.Vector3(x + behindCam.x, 0, y + behindCam.y))
      setTeleportRot(new THREE.Euler(0, rotation, 0))
    }, [])

    const groundTexture = useMemo(
      () => new THREE.TextureLoader().load('/data/system/grid_floor.png'), []
    )

    const rStats = useRStats()

    return (
      <>
        <group
          position={teleportPos}
          rotation={teleportRot}
        >
          <primitive object={camera}>
            <HUD position={[0, 0, -1]}>
              <FPSMeter rStats={rStats} textCreator={textCreator} position={[0.3, 0.05, 0]} />
            </HUD>
          </primitive>
        </group>

        <ambientLight color={0xffffff} intensity={world.ambient.intensity} />

        <mesh
          // slightly offset to allow for outlines
          position={[0, -0.03, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry attach='geometry' args={[45, 45, 32]} />
          <meshLambertMaterial attach='material' side={THREE.FrontSide} visible>
            <primitive attach='map' object={groundTexture} />
          </meshLambertMaterial>
        </mesh>
      </>
    )
  })

const XRStartButton = ({ }) => {
  const { gl } = useThree()

  useMemo(
    () => document.body.appendChild(WEBVR.createButton(gl)),
    []
  )

  return null
}

const SceneManagerXR = () => {
  const store = useStore()

  const loaded = true

  return (
    <>
      {
        !loaded && <div className='loading-button'>LOADING …</div>
      }
      <Canvas vr>
        <Provider store={store}>
          {
            loaded && <XRStartButton />
          }
          <SceneContent />
        </Provider>
      </Canvas>
      <div className='scene-overlay' />
    </>
  )
}

module.exports = SceneManagerXR
