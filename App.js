import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SHIP_WIDTH = 60;
const SHIP_HEIGHT = 60;
const ASTEROID_SIZE = 110; // Your massive planetary asteroid!

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
        duration: 7000, // Warp speed!
        useNativeDriver: true,
      }).start(() => startBackgroundScroll());
    };
    startBackgroundScroll();
  }, [scrollY]);

  // Interpolate movement for the two tiling sheets
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

  // --- ENGINE GAME LOOP ---
  useEffect(() => {
    if (gameOver) return;

    const gameLoop = setInterval(() => {
      setAsteroidPos((prev) => {
        const nextY = prev.y + 8; // Falling velocity speed

        // Check if asteroid hit the bottom boundary (Score point!)
        if (nextY > SCREEN_HEIGHT) {
          setScore((s) => s + 1);
          return {
            x: Math.random() * (SCREEN_WIDTH - ASTEROID_SIZE),
            y: -ASTEROID_SIZE,
          };
        }

        // --- AXIAL COLLISION DETECTION ---
        const shipY = SCREEN_HEIGHT - 160; // Ship bottom layout boundary
        const asteroidCenterX = prev.x + ASTEROID_SIZE / 2;
        const asteroidCenterY = prev.y + ASTEROID_SIZE / 2;
        const shipCenterX = shipX + SHIP_WIDTH / 2;
        const shipCenterY = shipY + SHIP_HEIGHT / 2;

        const distance = Math.sqrt(
          Math.pow(asteroidCenterX - shipCenterX, 2) + Math.pow(asteroidCenterY - shipCenterY, 2)
        );

        // Dynamic buffer zone based on your custom asteroid radius boundaries
        if (distance < (ASTEROID_SIZE / 2 + SHIP_WIDTH / 3)) {
          setGameOver(true);
          clearInterval(gameLoop);
        }

        return { x: prev.x, y: nextY };
      });
    }, 33); // ~30 FPS tracking loops

    return () => clearInterval(gameLoop);
  }, [shipX, gameOver]);

  // --- ACTIONS ---
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
      {/* LAYER 1: Hardware-accelerated Tiled Background */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Animated.View style={[styles.starTile, { transform: [{ translateY: translateTileA }] }]}>
          <StarFieldPattern />
        </Animated.View>
        <Animated.View style={[styles.starTile, { transform: [{ translateY: translateTileB }] }]}>
          <StarFieldPattern />
        </Animated.View>
      </View>

      {/* LAYER 2: Game HUD Overlay & Entities */}
      <View style={styles.hudHeader}>
        <Text style={styles.scoreText}>Score: {score}</Text>
        <Text style={styles.highScoreText}>Best: {highScore}</Text>
      </View>

      {!gameOver ? (
        <>
          {/* Giant Asteroid */}
          <View style={[styles.asteroid, { top: asteroidPos.y, left: asteroidPos.x }]} />

          {/* Spaceship with Engine Flame */}
          <View style={[styles.ship, { left: shipX }]}>
            <View style={{
              position: 'absolute',
              bottom: -15,
              left: '33%',
              width: 20,
              height: 15,
              backgroundColor: '#ffaa00',
              borderBottomLeftRadius: 10,
              borderBottomRightRadius: 10,
            }} />
          </View>

          {/* Bottom Control Pads */}
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
          <Text style={styles.gameOverSub}>The Asteroid crushed you!</Text>
          <TouchableOpacity style={styles.restartBtn} onPress={restartGame}>
            <Text style={styles.restartBtnText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Vector Starfield Pattern Node
function StarFieldPattern() {
  return (
    <View style={styles.starField}>
      <View style={[styles.star, { top: '10%', left: '15%' }]} />
      <View style={[styles.star, { top: '25%', left: '80%', width: 3, height: 3 }]} />
      <View style={[styles.star, { top: '45%', left: '35%' }]} />
      <View style={[styles.star, { top: '60%', left: '70%', opacity: 0.4 }]} />
      <View style={[styles.star, { top: '75%', left: '20%', width: 4, height: 4 }]} />
      <View style={[styles.star, { top: '85%', left: '90%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070714',
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
    opacity: 0.7,
  },
  hudHeader: {
    paddingTop: 50,
    paddingHorizontal: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  highScoreText: {
    color: '#00ffcc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  asteroid: {
    position: 'absolute',
    width: ASTEROID_SIZE,
    height: ASTEROID_SIZE,
    backgroundColor: '#524343',
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#3a2f2f',
  },
  ship: {
    /* --- ADVANCED SPACESHIP DESIGN STYLES --- */
  shipContainer: {
    position: 'absolute',
    bottom: 120,
    width: SHIP_WIDTH,
    height: SHIP_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shipCore: {
    width: 26,
    height: 52,
    backgroundColor: '#1e293b', // Sleek titanium dark armor plating
    borderTopLeftRadius: 15,    // Sharp aerodynamic forward nosecone
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    borderWidth: 2,
    borderColor: '#38bdf8',     // Neon energy matrix trim detailing
    position: 'relative',
    alignItems: 'center',
    zIndex: 2,
  },
  cockpit: {
    position: 'absolute',
    top: 10,
    width: 10,
    height: 18,
    backgroundColor: '#06b6d4', // Glowing cyan energy canopy shield
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    shadowColor: '#00f0ff',     // Neon bloom glow radius
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
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
    left: -2,
    borderTopWidth: 26,
    borderTopColor: 'transparent',
    borderRightWidth: 20,
    borderRightColor: '#0f172a', // Matte stealth dark-wing composite
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    borderLeftWidth: 0,
    borderLeftColor: 'transparent',
  },
  rightWing: {
    right: -2,
    borderTopWidth: 26,
    borderTopColor: 'transparent',
    borderRightWidth: 0,
    borderRightColor: 'transparent',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    borderLeftWidth: 20,
    borderLeftColor: '#0f172a', // Symmetrical starfighter silhouette
  },
  blasterLeft: {
    position: 'absolute',
    left: -4,
    top: 22,
    width: 4,
    height: 12,
    backgroundColor: '#38bdf8',
    borderRadius: 2,
  },
  blasterRight: {
    position: 'absolute',
    right: -4,
    top: 22,
    width: 4,
    height: 12,
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
    backgroundColor: '#ff7700', // Incandescent plasma engine flame core
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    marginHorizontal: 1,
    shadowColor: '#ff3700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  centerFlame: {
    width: 10,
    height: 20,
    backgroundColor: '#ff9900', // High velocity focus center plume
  },
  sideFlame: {
    width: 5,
    height: 12,
    opacity: 0.85,
  },     // Shield highlighting border
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 30,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  btn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: 100,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 28,
  },
  gameOverScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverTitle: {
    color: '#ff3333',
    fontSize: 42,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  gameOverSub: {
    color: '#aaaaaa',
    fontSize: 16,
    marginVertical: 15,
  },
  restartBtn: {
    backgroundColor: '#00ffcc',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  restartBtnText: {
    color: '#070714',
    fontSize: 18,
    fontWeight: 'bold',
  },
});