import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  ListView,
  Dimensions,
  PanResponder,
  Animated
} from 'react-native';
import data from './mock/data.js';

let Window = Dimensions.get('window');


class dragDropExample extends Component {
    constructor() {
        super();

        this.state = {
            pan: new Animated.ValueXY({
                x: 10,
                y: Window.height - 60
            })
        }

        this._panResponder = PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: Animated.event([
                null,
                {
                    moveX: this.state.pan.x,
                    moveY: this.state.pan.y
                }
            ])
        });

    }

    render() {
        return (
            <View style={styles.container}>
                <Animated.View
                    style={[this.state.pan.getLayout(), styles.draggable]}
                     {...this._panResponder.panHandlers}
                >
                    <Text>
                        Selected Item : 2
                    </Text>
                </Animated.View>
            </View>
        )
    }

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF'
    },
    draggable: {
        position: 'absolute',
        backgroundColor: '#FAECF7',
        width: 150,
        height: 30
        // top: Window.height - 60,
        // left: 10
    }
});

AppRegistry.registerComponent('dragDropExample', () => dragDropExample);
