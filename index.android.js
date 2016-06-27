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

        var ds = new ListView.DataSource({
            rowHasChanged: (r1, r2) => r1 !== r2
        })

        this.state = {
            dataSource: ds.cloneWithRows(data),
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
            ]),
            onPanResponderStart: (e, gestureState) => {
                this.state.pan.setOffset({
                    x: -e.nativeEvent.locationX,
                    y: -e.nativeEvent.locationY
                });
            }
        });

        this.renderRow = this._renderRow.bind(this);

    }

    render() {
        return (
            <View style={styles.container}>
                {this._getListView()}
                {this._getDraggableContainerView()}
            </View>
        )
    }

    _getListView() {
        return (
            <View style={styles.listViewContainer}>
                <ListView
                    dataSource={this.state.dataSource}
                    renderRow={this.renderRow}
                />
            </View>
        )
    }

    _getDraggableContainerView() {
        return (
            <Animated.View
                style={[this.state.pan.getLayout(), styles.draggable]}
                 {...this._panResponder.panHandlers}
            >
                <Text>
                    Selected Item : 2
                </Text>
            </Animated.View>
        )
    }

    _renderRow(item) {
        return (
            <View style={styles.listItemContainer}>
                <View>
                    <Text>
                        id: {item.id}
                    </Text>
                </View>
                <View>
                    <Text>
                        name: {item.name}
                    </Text>
                </View>
                <View>
                    <Text>
                        department: {item.departmentName}
                    </Text>
                </View>
            </View>
        )
    }

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: '#FFFFFF'
    },
    draggable: {
        position: 'absolute',
        backgroundColor: '#FAECF7',
        width: 150,
        height: 30
    },
    listItemContainer: {
        backgroundColor: 'rgb(240, 240, 240)',
        alignItems: 'flex-start',
        flex: 1,
        marginBottom: 2,
        paddingLeft: 5
    },
    listViewContainer: {
        flex: 1,
        alignItems: 'stretch'
    }
});

AppRegistry.registerComponent('dragDropExample', () => dragDropExample);
