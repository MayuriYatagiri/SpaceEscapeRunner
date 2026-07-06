import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SHIP_WIDTH = 85;
const SHIP_HEIGHT = 60;
const ASTEROID_SIZE = 110; // Massive cosmic hazard boundary

export default function App() {
  // --- ANIMATION STATES (BACKGROUND) ---
  const scrollY = useRef(new Animated.Value(0)).current;

  // --- GAME STATES ---
  const [shipX, setShipX] = useState((SCREEN_WIDTH - SHIP_WIDTH) / 2);
  const [asteroidPos, setAsteroidPos] = useState({ x: Math.random() * (SCREEN_WIDTH - ASTEROID_SIZE), y: -ASTEROID_SIZE });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // --- BACKGROUND INFINITE SCROLL LOOP ---
  useEffect(() => {
    const startBackgroundScroll = () => {
      scrollY.setValue(0);
      Animated.timing(scrollY, {
        toValue: SCREEN_HEIGHT,
        duration: 7000, // Warp velocity configuration
        useNativeDriver: true, // Offloads to UI thread for seamless 60fps
      }).start(() => startBackgroundScroll());
    };
    startBackgroundScroll();
  }, [scrollY]);

  // Interpolate movement loops for the dual tiling background wrappers
  const translateTileA = scrollY.interpolate({
    inputRange: [0, SCREEN_HEIGHT],
    outputRange: [0, SCREEN_HEIGHT],
  });
  const translateTileB = scrollY.interpolate({
    inputRange: [0, SCREEN_HEIGHT],
    outputRange: [-SCREEN_HEIGHT, 0],
  });

  // --- HIGH SCORE PERSISTENCE ---
  useEffect(() => {
    loadHighScore();
  }, []);

  const loadHighScore = async () => {
    try {
      const savedScore = await AsyncStorage.getItem('space_high_score');
      if (savedScore !== null) setHighScore(parseInt(savedScore, 10));
    } catch (e) {
      console.log('Failed to load high score.');
    }
  };

  const saveHighScore = async (newHigh) => {
    try {
      await AsyncStorage.setItem('space_high_score', newHigh.toString());
    } catch (e) {
      console.log('Failed to save high score.');
    }
  };

  // --- MAIN PHYSICS GAME ENGINE ---
  useEffect(() => {
    if (gameOver) return;

    const gameLoop = setInterval(() => {
      setAsteroidPos((prev) => {
        const nextY = prev.y + 8; // Falling linear velocity trajectory step

        // Check if asteroid passed completely off screen (Point cleared!)
        if (nextY > SCREEN_HEIGHT) {
          setScore((s) => s + 1);
          return {
            x: Math.random() * (SCREEN_WIDTH - ASTEROID_SIZE),
            y: -ASTEROID_SIZE,
          };
        }

        // --- AXIAL COLLISION HANDLING ENGINE ---
        const shipY = SCREEN_HEIGHT - 160; // Locked coordinate for ship plane boundary
        const asteroidCenterX = prev.x + ASTEROID_SIZE / 2;
        const asteroidCenterY = prev.y + ASTEROID_SIZE / 2;
        const shipCenterX = shipX + SHIP_WIDTH / 2;
        const shipCenterY = shipY + SHIP_HEIGHT / 2;

        const distance = Math.sqrt(
          Math.pow(asteroidCenterX - shipCenterX, 2) + Math.pow(asteroidCenterY - shipCenterY, 2)
        );

        // Dynamic collision boundary factoring the radius profiles
        if (distance < (ASTEROID_SIZE / 2 + SHIP_WIDTH / 3)) {
          setGameOver(true);
          clearInterval(gameLoop);
        }

        return { x: prev.x, y: nextY };
      });
    }, 33); // Ticks at roughly 30 execution intervals per second

    return () => clearInterval(gameLoop);
  }, [shipX, gameOver]);

  // --- CONTROLLER MOVEMENT COMMANDS ---
  const moveLeft = () => {
    if (gameOver) return;
    setShipX((x) => Math.max(0, x - 30));
  };

  const moveRight = () => {
    if (gameOver) return;
    setShipX((x) => Math.min(SCREEN_WIDTH - SHIP_WIDTH, x + 30));
  };

  const restartGame = () => {
    if (score > highScore) {
      setHighScore(score);
      saveHighScore(score);
    }
    setScore(0);
    setAsteroidPos({ x: Math.random() * (SCREEN_WIDTH - ASTEROID_SIZE), y: -ASTEROID_SIZE });
    setShipX((SCREEN_WIDTH - SHIP_WIDTH) / 2);
    setGameOver(false);
  };

  return (
    <View style={styles.container}>
      {/* LAYER 1: Hardware-Accelerated Scrolling Starfield Background */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Animated.View style={[styles.starTile, { transform: [{ translateY: translateTileA }] }]}>
          <StarFieldPattern />
        </Animated.View>
        <Animated.View style={[styles.starTile, { transform: [{ translateY: translateTileB }] }]}>
          <StarFieldPattern />
        </Animated.View>
      </View>

      {/* LAYER 2: Game HUD Metrics Interface */}
      <View style={styles.hudHeader}>
        <Text style={styles.scoreText}>Score: {score}</Text>
        <Text style={styles.highScoreText}>Best: {highScore}</Text>
      </View>

      {!gameOver ? (
        <>
          {/* NATURAL JAGGED ASTEROID WITH TEXTURED CRATERS */}
          <View style={[styles.asteroidContainer, { top: asteroidPos.y, left: asteroidPos.x }]}>
            {/* Layer 1: Jagged outer rock fragments to break the perfect circle shape */}
            <View style={styles.asteroidJaggedShard} />
            
            {/* Layer 2: Main textured core body */}
            <View style={styles.asteroidCoreBody}>
              {/* Layer 3: Surface Impact Craters */}
              <View style={[styles.crater, { top: '20%', left: '25%', width: 22, height: 18 }]} />
              <View style={[styles.crater, { top: '55%', left: '15%', width: 14, height: 14 }]} />
              <View style={[styles.crater, { top: '30%', left: '60%', width: 28, height: 24 }]} />
              <View style={[styles.crater, { top: '65%', left: '55%', width: 18, height: 15 }]} />
              
              {/* Small surface ridge highlights */}
              <View style={styles.rockRidge} />
            </View>
          </View>

          {/* HIGH-TECH STARFIGHTER SPACESHIP SHIP CONTAINER */}
          <View style={[styles.shipContainer, { left: shipX }]}>
            {/* Structural Wings */}
            <View style={[styles.wing, styles.leftWing]} />
            <View style={[styles.wing, styles.rightWing]} />
            
            {/* Main Armored Hull Composite */}
            <View style={styles.shipCore}>
              {/* Mounted Laser Blasters */}
              <View style={styles.blasterLeft} />
              <View style={styles.blasterRight} />
              
              {/* Radiant Cyan Pilot Cockpit */}
              <View style={styles.cockpit} />
            </View>

            {/* TRIPLE AFTERBURNER FLARE VECTOR ARRAY */}
            <View style={styles.thrusterAssembly}>
              <View style={[styles.flameBase, styles.sideFlame]} />
              <View style={[styles.flameBase, styles.centerFlame]} />
              <View style={[styles.flameBase, styles.sideFlame]} />
            </View>
          </View>

          {/* User Input Dynamic Control Pads */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.btn} onPress={moveLeft}>
              <Text style={styles.btnText}>◀</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={moveRight}>
              <Text style={styles.btnText}>▶</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.gameOverScreen}>
          <Text style={styles.gameOverTitle}>GAME OVER</Text>
          <Text style={styles.gameOverSub}>The Asteroid crushed your hull!</Text>
          <TouchableOpacity style={styles.restartBtn} onPress={restartGame}>
            <Text style={styles.restartBtnText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Seamless Repeatable Vector Constellation Pattern
function StarFieldPattern() {
  return (
    <View style={styles.starField}>
      <View style={[styles.star, { top: '12%', left: '15%' }]} />
      <View style={[styles.star, { top: '28%', left: '82%', width: 3, height: 3 }]} />
      <View style={[styles.star, { top: '48%', left: '38%' }]} />
      <View style={[styles.star, { top: '63%', left: '74%', opacity: 0.4 }]} />
      <View style={[styles.star, { top: '78%', left: '22%', width: 4, height: 4 }]} />
      <View style={[styles.star, { top: '88%', left: '92%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060612', // Deep space visual base hue
  },
  starTile: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  starField: {
    flex: 1,
    position: 'relative',
  },
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 50,
    opacity: 0.75,
  },
  hudHeader: {
    paddingTop: 55,
    paddingHorizontal: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  scoreText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  highScoreText: {
    color: '#00f0ff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  /* --- NATURAL TEXTURED ASTEROID STYLES --- */
  asteroidContainer: {
    position: 'absolute',
    width: ASTEROID_SIZE,
    height: ASTEROID_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  asteroidCoreBody: {
    width: '90%',
    height: '90%',
    backgroundColor: '#524545', // Dark carbonaceous rock base hue
    borderRadius: 50,           // Base roundness
    borderWidth: 4,
    borderColor: '#3a3030',     // Shadowed outer crust line
    position: 'relative',
    overflow: 'hidden',         // Clips craters to the asteroid boundary
    zIndex: 2,
  },
  asteroidJaggedShard: {
    position: 'absolute',
    width: '92%',
    height: '92%',
    backgroundColor: '#473c3c', // Secondary shading rock layer
    borderRadius: 38,           // Mismatched radius breaks symmetry
    transform: [{ rotate: '35deg' }], // Rotated to create sharp, rocky edges
    borderWidth: 3,
    borderColor: '#2d2525',
    zIndex: 1,
  },
  crater: {
    position: 'absolute',
    backgroundColor: '#2d2525', // Deep recessed shadow interior
    borderRadius: 50,
    borderBottomWidth: 2,
    borderBottomColor: '#6e5d5d', // Sunlit rocky crater rim highlight
    opacity: 0.85,
  },
  rockRidge: {
    position: 'absolute',
    top: '15%',
    right: '10%',
    width: '40%',
    height: '40%',
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#6e5d5d',     // Surface fault line ridge definition
    borderRadius: 20,
    opacity: 0.4,
  },
  /* --- STARFIGHTER STRUCTURAL LAYOUT DESIGN --- */
  shipContainer: {
    position: 'absolute',
    bottom: 120, // Lower viewport positioning plane alignment
    width: SHIP_WIDTH,
    height: SHIP_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shipCore: {
    width: 26,
    height: 52,
    backgroundColor: '#1e293b', // High tensile titanium dark plating color
    borderTopLeftRadius: 15,    // Aerodynamic continuous nosecone contour
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    borderWidth: 2,
    borderColor: '#38bdf8',     // Glowing defense grid tracking border lines
    position: 'relative',
    alignItems: 'center',
    zIndex: 2,
  },
  cockpit: {
    position: 'absolute',
    top: 10,
    width: 10,
    height: 18,
    backgroundColor: '#06b6d4', // Translucent pilot view canopy matrix
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  wing: {
    position: 'absolute',
    bottom: 4,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    zIndex: 1,
  },
  leftWing: {
    left: 4,                  // Pushed outwards toward the new container boundaries
    borderTopWidth: 28,
    borderTopColor: 'transparent',
    borderRightWidth: 32,      // Widened from 20 to extend the wing surface area
    borderRightColor: '#0f172a',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    borderLeftWidth: 0,
    borderLeftColor: 'transparent',
  },
  rightWing: {
    right: 4,                 // Pushed outwards toward the new container boundaries
    borderTopWidth: 28,
    borderTopColor: 'transparent',
    borderRightWidth: 0,
    borderRightColor: 'transparent',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    borderLeftWidth: 32,      // Widened from 20 to match symmetrically
    borderLeftColor: '#0f172a',
  },
  blasterLeft: {
    position: 'absolute',
    left: -14,                 // Shifted out to align with the wider left wingtip
    top: 22,
    width: 4,
    height: 14,
    backgroundColor: '#38bdf8',
    borderRadius: 2,
  },
  blasterRight: {
    position: 'absolute',
    right: -14,                // Shifted out to align with the wider right wingtip
    top: 22,
    width: 4,
    height: 14,
    backgroundColor: '#38bdf8',
    borderRadius: 2,
  },
  thrusterAssembly: {
    position: 'absolute',
    bottom: -18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
    zIndex: 0,
  },
  flameBase: {
    backgroundColor: '#ff7700', // Searing plasma core coloration
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    marginHorizontal: 1,
  },
  centerFlame: {
    width: 10,
    height: 20,
    backgroundColor: '#ff9900', // Extended afterburner focus column
  },
  sideFlame: {
    width: 5,
    height: 12,
    opacity: 0.85,
  },
  /* --- NAVIGATION CONTROLS OVERLAYS --- */
  controlsContainer: {
    position: 'absolute',
    bottom: 35,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  btn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    width: 110,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 28,
  },
  gameOverScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  gameOverTitle: {
    color: '#ef4444',
    fontSize: 44,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  gameOverSub: {
    color: '#94a3b8',
    fontSize: 16,
    marginVertical: 20,
    textAlign: 'center',
  },
  restartBtn: {
    backgroundColor: '#00f0ff',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 30,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  restartBtnText: {
    color: '#060612',
    fontSize: 18,
    fontWeight: 'bold',
  },
});