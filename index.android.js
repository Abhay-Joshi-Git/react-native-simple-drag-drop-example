/*

TODO -

1. handle velocity while scrolling on move - see the difference in scrolling when draggable is on and off
2. opacity and size while long-press
3. release immediately
4. release in drop container
5. multi-select
6. handle screen rotation - width etc
7. create component to provide this functionality
*/

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  ListView,
  Dimensions,
  PanResponder,
  Animated,
  TouchableHighlight
} from 'react-native';
import data from './mock/data.js';
import reactMixin from 'react-mixin';
import timerMixin from 'react-timer-mixin';

//should be called on render rather than caching the value, it may change e.g. due to rotation
var Window = Dimensions.get('window');
const ROW_HEIGHT = 60;
const DROP_CONTAINER_HEIGHT = 40;
const ROW_DROP_ENABLE_HEIGHT = ROW_HEIGHT / 2;
const DRAGGABLE_HEIGHT_DEFAULT = 30;
const SCROLL_OFFSET = 2;
const SCROLL_GUTTER = 10;
const DRAGGABLE_WIDTH_ON_APPEARANCE = 200;
const DRAGGABLE_OPACITY_ON_APPEARANCE = 0.5;
const DRAGGABLE_WIDTH_DEFAULT = 300;
const DRAGGABLE_OPACITY_DEFAULT = 0; //for experimets
const DRAGGABLE_OPACITY_FINAL = 0; //for experimets

updatedData = data.map((item, index) => {
    return {
        ...item,
        index: index,
        selected: false
    }
})

class dragDropExample extends Component {
    constructor() {
        super();

        var ds = new ListView.DataSource({
            rowHasChanged: (r1, r2) => {
                return ((r1 !== r2) ||
                    (r2.index == this.state.prevDropRowIndex) ||
                    (r2.index == this.state.currDropRowIndex))
            }
        })

        this.state = {
            dataSource: ds.cloneWithRows(updatedData),
            pan: this._getDefaultpan(),
            prevDropRowIndex: -1,
            currDropRowIndex: -1,
            selectedRowIndex: new Animated.Value(-1),
            draggableOpacity: new Animated.Value(DRAGGABLE_OPACITY_DEFAULT),
            draggableHeight: new Animated.Value(Window.height),
            draggableTop: new Animated.Value(0)
        }
        this.layoutMap = [];
        this._responderCreate();
        this._bindFunctions();
        this.totalScrollOffset = 0;
        this.moveStartOffset = 0;
        this.draagablePanStartRespond = false;
        this.draggablePanStartRespondTimeoutReference = null;
    }

    _responderCreate() {
        this._draggablePanResponderCreate();
        this._listViewPanResponderCreate();
        this._listViewItemPanResponderCreate();
    }

    _getDefaultpan() {
        return new Animated.ValueXY({
            x: 0,
            y: 0
        })
    }

    _getDraggableDefaultPosition() {
        return {
            x: 10,
            y: Window.height - 60
        };
    }

    _draggablePanResponderCreate() {
            this._panResponderMap = PanResponder.create({
                onStartShouldSetPanResponder: () => {
                    return ((this.state.selectedRowIndex._value != -1))
                },
                onMoveShouldSetPanResponder: () => {
                    return ((this.state.selectedRowIndex._value != -1))
                },
                onMoveShouldSetPanResponderCapture: () => {
                    return ((this.state.selectedRowIndex._value != -1))
                },
                onStartShouldSetPanResponderCapture: () => {
                    return true
                },
                onPanResponderMove: (e, gestureState) => {
                    if ((this.state.selectedRowIndex._value == -1)) {
                        var movement = gestureState.y0 - gestureState.moveY;
                        if (Math.abs(movement) > 50) {
                            this.draagablePanStartRespond = false;
                            if (this.draggablePanStartRespondTimeoutReference) {
                                this.clearTimeout(this.draggablePanStartRespondTimeoutReference);
                                this.draggablePanStartRespondTimeoutReference = null;
                            }
                        } else {
                            return
                        }

                        var scrollTo = this.moveStartOffset + movement;
                        console.log('move - ', this.totalScrollOffset, gestureState, scrollTo);
                        this.listView.scrollTo({
                            y: scrollTo,
                            animated: true
                        })
                        return;
                    }

                    var scrollDown = (gestureState.moveY + DRAGGABLE_HEIGHT_DEFAULT + SCROLL_GUTTER) > Dimensions.get('window').height;
                    var scrollUp = ((gestureState.moveY - SCROLL_GUTTER) < 0) && (this.totalScrollOffset > 0);
                    if (scrollDown || scrollUp && false) {
                        let scrollIntensityOffset = SCROLL_OFFSET;
                        if (scrollDown) {
                            scrollIntensityOffset =  gestureState.moveY - Dimensions.get('window').height - 10;
                        } else {
                            scrollIntensityOffset =  gestureState.moveY - 0;
                        }
                        if (scrollIntensityOffset < SCROLL_OFFSET) {
                            scrollIntensityOffset = SCROLL_OFFSET
                        }

                        if (!this._autoScrollingInterval) {
                            this._autoScrollingInterval =  this.setInterval(() => {
                                this.totalScrollOffset += scrollDown ? scrollIntensityOffset : (-scrollIntensityOffset);
                                this.listView.scrollTo({
                                    y: this.totalScrollOffset,
                                    animated: true
                                });
                                this.moveDropRowContainer(gestureState, {
                                    pan: this.state.pan//[item.index]
                                });
                            }, 20);
                        }
                        return;
                    } else if (this._autoScrollingInterval) {
                        this.clearInterval(this._autoScrollingInterval);
                        this._autoScrollingInterval = null;
                    }
                    this.moveDropRowContainer(gestureState, {
                        pan: this.state.pan//[item.index]
                    });
                },
                onPanResponderStart: (e, gestureState) => {
                    console.log('pan responder start - ', e.nativeEvent);
                    if (this.state.selectedRowIndex._value != -1) {
                        this.state.pan.setOffset({
                            x: -e.nativeEvent.locationX,
                            y: -e.nativeEvent.locationY
                        });
                    } else {
                        var draggableNativeEvent = e.nativeEvent;
                        this.moveStartOffset = this.totalScrollOffset;
                        this.draagablePanStartRespond = true;
                        this.draggablePanStartRespondTimeoutReference = this.setTimeout(() => {
                            if (this.draagablePanStartRespond) {
                                this.draagablePanStartRespond = false;
                                this.onDraggableLongPress(gestureState.y0);
                            }
                        }, 1000)
                    }
                },
                onPanResponderRelease: (e, gestureState) => {
                    console.log('release - ', gestureState, e.nativeEvent);
                    if (this._autoScrollingInterval) {
                        this.clearInterval(this._autoScrollingInterval);
                        this._autoScrollingInterval = null;
                    }
                    if (this.draggablePanStartRespondTimeoutReference) {
                        this.clearTimeout(this.draggablePanStartRespondTimeoutReference);
                        this.draggablePanStartRespondTimeoutReference = null;
                    }
                    if (this.draagablePanStartRespond) {
                        this.draagablePanStartRespond = false;
                        let index = this._getRowIndexByY(gestureState.y0 + this.totalScrollOffset)//null;
                        if (index) {
                            this._onRowPress(updatedData[index]);
                        }
                    } else if (this.state.selectedRowIndex._value != -1) {
                        //set poistion of pan near to bottom
                        //change width, opacity
                        this.state.pan.setValue(this._getDraggableDefaultPosition());
                        this.state.draggableOpacity.setValue(DRAGGABLE_OPACITY_FINAL);
                    }
                }
            })
    }

    _moveDropRowContainer(gestureState, options) {
        if (((gestureState.moveY + DRAGGABLE_HEIGHT_DEFAULT + SCROLL_GUTTER) < Dimensions.get('window').height) &&
        ((gestureState.moveY - SCROLL_GUTTER) > 0)){
            options.pan.setValue({
                x: 20,
                y: gestureState.moveY
            });
        }
        let dropIndex = Math.ceil((gestureState.moveY - ROW_DROP_ENABLE_HEIGHT + this.totalScrollOffset) / ROW_HEIGHT);
        if ((this.state.currDropRowIndex != dropIndex) ||
           (this.state.currDropRowIndex != this.state.prevDropRowIndex)) {
           this.setState({
               prevDropRowIndex: this.state.currDropRowIndex,
               currDropRowIndex:  dropIndex,
               dataSource: this.state.dataSource.cloneWithRows(updatedData)
           })
        }
        // }
        // else if (this.state.currDropRowIndex != -1) {
        //     this.setState({
        //         prevDropRowIndex: -1,
        //         currDropRowIndex: -1,
        //         dataSource: this.state.dataSource.cloneWithRows(updatedData)
        //     })
        // }
    }

    _listViewPanResponderCreate() {
        this._listViewPanResponder = PanResponder.create({
            onPanResponderTerminationRequest: () => true
        })
    }

    _listViewItemPanResponderCreate() {
        this._listViewItemPanResponder = PanResponder.create({
            onPanResponderTerminationRequest: () => true
        })
    }


    _bindFunctions() {
        this.getListView = this._getListView.bind(this);
        this.getDraggableContainerView = this._getDraggableContainerView.bind(this);
        this.renderRow = this._renderRow.bind(this);
        this.rowLayout = this._rowLayout.bind(this);
        this.logLayoutAndReturnNull = this._logLayoutAndReturnNull.bind(this);
        this.renderRowDropContainer = this._renderRowDropContainer.bind(this);
        this.renderActualRow = this._renderActualRow.bind(this);
        this.moveDropRowContainer = this._moveDropRowContainer.bind(this);
        this.onListViewScroll = this._onListViewScroll.bind(this);
        this.onDraggableLongPress = this._onDraggableLongPress.bind(this);
    }

    render() {
        Window = Dimensions.get('window');
        return (
            <View style={styles.container}>
                {this.getListView()}
                {
                    this.getDraggableContainerView({
                            pan: this.state.pan,
                            panResponder: this._panResponderMap,
                            index: 0
                        })
                }

            </View>
        )
    }

    _getListView() {
        return (
            <View style={styles.listViewContainer}>
                <ListView
                    dataSource={this.state.dataSource}
                    renderRow={this.renderRow}
                    ref={el => {this.listView = el}}
                    {...this._listViewPanResponder.panHandlers}
                    onScroll={this.onListViewScroll}
                />
            </View>
        )
    }

    _onListViewScroll(e) {
        this.totalScrollOffset = e.nativeEvent.contentOffset.y;
    }

    _getDraggableContainerView(options) {
        let selectedCount = this._getSelectedCount();
        if (true) {
            console.log(options.pan)
            return (
                <Animated.View
                    style={[options.pan.getLayout(), styles.draggable, {
                        opacity: this.state.draggableOpacity,
                        height: this.state.draggableHeight,
                        width: DRAGGABLE_WIDTH_ON_APPEARANCE,
                    }]}
                    {...options.panResponder.panHandlers}
                     ref={(el) => {this._draggableElement = el}}
                     key={options.index}
                >
                    <TouchableHighlight
                        onLongPress={(e) => {
                            var touchYCoordinate = e.touchHistory.touchBank[0].startPageY;
                            this.onDraggableLongPress(touchYCoordinate);
                        }}
                        style={{
                            height: this.state.draggableHeight._value
                        }}
                    >
                        <View>
                            <Text>
                                Selected Item : {selectedCount}
                            </Text>
                        </View>
                    </TouchableHighlight>
                </Animated.View>
            )
        } else {
            return null
        }
    }

    _onDraggableLongPress(touchYCoordinate) {
        var index = this._getRowIndexByY(touchYCoordinate + this.totalScrollOffset);

        updatedData = [
            ...updatedData.slice(0, index),
            {
                ...updatedData[index],
                selected: !updatedData[index].selected
            },
            ...updatedData.slice(index + 1, updatedData.length)
        ];

        this.setState({
            dataSource: this.state.dataSource.cloneWithRows(updatedData)
        })
        this.state.selectedRowIndex.setValue(index)
        this.state.draggableOpacity.setValue(DRAGGABLE_OPACITY_ON_APPEARANCE)
        this.state.draggableHeight.setValue(DRAGGABLE_HEIGHT_DEFAULT)
        this.state.pan.setValue({
            x: 20,
            y: touchYCoordinate
        })

    }

    _getRowIndexByY(y) {
        var rowIndex = 0;
        for (var i = 0; i < this.layoutMap.length; i++) {
            if ((this.layoutMap[i].y <= y) && ((this.layoutMap[i].y + ROW_HEIGHT) > y)) {
                rowIndex = i;
                break;
            }
        }
        return rowIndex;
    }

    _getSelectedCount() {
        return updatedData.filter(item => item.selected).length;
    }

    _renderRow(item, section, index) {
        return (
            <View
                style={{
                    flex: 1,
                    marginBottom: 2,
                    height: (index == this.state.currDropRowIndex) ? ROW_HEIGHT + DROP_CONTAINER_HEIGHT : ROW_HEIGHT
                }}
                onLayout={(e) => this._rowLayout(e, index)}
            >
                {this.renderRowDropContainer(index)}
                {this.renderActualRow(item, index)}
            </View>
        )
    }

    _renderActualRow(item, rowIndex) {
        return (
            <TouchableHighlight
                style={[
                    styles.listItemContainer,
                    {
                        backgroundColor: item.selected ? 'grey' : 'rgb(230, 240, 240)'
                    }
                ]}
                onLongPress={() => {
                    this._onRowLongPress(item)
                }}
                onPress={() => {
                    this._onRowPress(item)
                }}
                underlayColor={item.selected ? 'grey' : 'rgba(230, 240, 240, 0.6)'}
                {...this._listViewItemPanResponder.panHandlers}
            >
                <View>
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
            </TouchableHighlight>
        )
    }

    _onRowPress(item) {
        console.log('on row press', item);
    }

    _onRowLongPress(item) {
        let selectedCount = this._getSelectedCount();

        itemIndex = updatedData.findIndex(dataItem => item.id == dataItem.id);

        updatedData = [
            ...updatedData.slice(0, itemIndex),
            {
                ...item,
                selected: !item.selected
            },
            ...updatedData.slice(itemIndex + 1, updatedData.length)
        ];
        // this.state.selectedRowIndex.setValue(itemIndex)
        // this.state.draggableOpacity.setValue(1)//Map[itemIndex]
        // this.setState({
        //     dataSource: this.state.dataSource.cloneWithRows(updatedData),
        // });
    }

    _onRowPressOut(item) {
        //  this.state.pan[item.index].setValue(this._getDraggableDefaultPosition());
    }

    _renderRowDropContainer(rowIndex) {
        if (rowIndex == this.state.currDropRowIndex) {
            return (
                <View
                    style={styles.rowDropContainer}
                >
                    <Text>
                        Drop here!!
                    </Text>
                </View>
            )
        } else {
            return null
        }
    }

    _rowLayout(e, index) {
        this.layoutMap[index] = e.nativeEvent.layout
    }

    _logLayoutAndReturnNull(index) {
        return null;
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
        backgroundColor: 'rgb(210, 180, 180)',
        width: 150,
        height: DRAGGABLE_HEIGHT_DEFAULT
    },
    listItemContainer: {
        backgroundColor: 'rgb(230, 240, 240)',
        alignItems: 'flex-start',
        marginBottom: 2,
        paddingLeft: 5,
        height: ROW_HEIGHT
    },
    rowDropContainer: {
        height: DROP_CONTAINER_HEIGHT
    },
    rowContainer: {
        flex: 1
    },
    listViewContainer: {
        flex: 1,
        alignItems: 'stretch'
    }
});

reactMixin(dragDropExample.prototype, timerMixin);

AppRegistry.registerComponent('dragDropExample', () => dragDropExample);
