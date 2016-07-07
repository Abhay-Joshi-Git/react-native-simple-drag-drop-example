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
let Window = Dimensions.get('window');
const rowHeight = 60;
const dropContainerHeight = 40;
const rowDropEnableHeight = rowHeight / 2;
const defaultDraggableHeight = 30;
var scrollOffset = 2;
const scrollGutter = 10;
const defaultDraggableWidth = Window.width;

const defaultDraggableOpacity = 0.4; //for experimets

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
            panValueMap: this._getDefaultPanValueMap(),
            prevDropRowIndex: -1,
            currDropRowIndex: -1,
            selectedRowIndex: new Animated.Value(-1),
            draggableOpacity: new Animated.Value(defaultDraggableOpacity),
            draggableHeight: new Animated.Value(Window.height),
            draggableTop: new Animated.Value(0)
        }
        this.layoutMap = [];
        this._responderCreate();
        this._bindFunctions();
        this.totalScrollOffSet = 0;
        this.moveStartOffset = 0;
        this.panStartDraggable = false;
        this.panStartTimeoutReference = null;
    }

    _responderCreate() {
        this._draggablePanResponderCreate();
        this._listViewPanResponderCreate();
        this._listViewItemPanResponderCreate();
    }

    _getDefaultPanValueMap() {
        // return updatedData.map((item, index) => {
            return new Animated.ValueXY({
                x: 0,
                y: 0
            })
        // })


        // return updatedData.map((item, index) => {
        //     return new Animated.ValueXY({
        //         x: 20,
        //         y: (index + 1) * 100
        //     })
        // })
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
                    return true//(this.state.selectedRowIndex._value != -1)
                },
                onPanResponderMove: (e, gestureState) => {
                    if ((this.state.selectedRowIndex._value == -1)) {
                        this.panStartDraggable = false;
                        if (this.panStartTimeoutReference) {
                            this.clearTimeout(this.panStartTimeoutReference);
                            this.panStartTimeoutReference = null;
                        }

                        var movement = gestureState.y0 - gestureState.moveY;
                        var scrollTo = this.moveStartOffset + movement;
                        console.log('move - ', this.totalScrollOffSet, gestureState, scrollTo);
                        this.listView.scrollTo({
                            y: scrollTo,
                            animated: true
                        })
                        return;
                    }

                    var scrollDown = (gestureState.moveY + defaultDraggableHeight + scrollGutter) > Dimensions.get('window').height;
                    var scrollUp = ((gestureState.moveY - scrollGutter) < 0) && (this.totalScrollOffSet > 0);
                    if (scrollDown || scrollUp && false) {
                        let scrollIntensityOffset = scrollOffset;
                        if (scrollDown) {
                            scrollIntensityOffset =  gestureState.moveY - Dimensions.get('window').height - 10;
                        } else {
                            scrollIntensityOffset =  gestureState.moveY - 0;
                        }
                        if (scrollIntensityOffset < scrollOffset) {
                            scrollIntensityOffset = scrollOffset
                        }

                        if (!this._autoScrollingInterval) {
                            this._autoScrollingInterval =  this.setInterval(() => {
                                this.totalScrollOffSet += scrollDown ? scrollIntensityOffset : (-scrollIntensityOffset);
                                this.listView.scrollTo({
                                    y: this.totalScrollOffSet,
                                    animated: true
                                });
                                this.moveDropRowContainer(gestureState, {
                                    pan: this.state.panValueMap//[item.index]
                                });
                            }, 20);
                        }
                        return;
                    } else if (this._autoScrollingInterval) {
                        this.clearInterval(this._autoScrollingInterval);
                        this._autoScrollingInterval = null;
                    }
                    this.moveDropRowContainer(gestureState, {
                        pan: this.state.panValueMap//[item.index]
                    });
                },
                onPanResponderStart: (e, gestureState) => {
                    console.log('pan responder start - ', e.nativeEvent);
                    if ((this.state.selectedRowIndex._value != -1)) {
                        this.state.panValueMap.setOffset({
                            x: -e.nativeEvent.locationX,
                            y: -e.nativeEvent.locationY
                        });
                    } else {
                        var draggableNativeEvent = e.nativeEvent;
                        this.moveStartOffset = this.totalScrollOffSet;
                        this.panStartDraggable = true;
                        this.panStartTimeoutReference = this.setTimeout(() => {
                            if (this.panStartDraggable) {
                                this.panStartDraggable = false;
                                //fire longpress
                                // this.state.panValueMap.setOffset({
                                //     x: -draggableNativeEvent.locationX
                                // });
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
                    if (this.panStartTimeoutReference) {
                        this.clearTimeout(this.panStartTimeoutReference);
                        this.panStartTimeoutReference = null;
                    }
                    if (this.panStartDraggable) {
                        this.panStartDraggable = false;
                        //fire press
                        let index = this._getRowIndexByY(gestureState.y0 + this.totalScrollOffSet)//null;
                        if (index) {
                            this._onRowPress(updatedData[index]);
                        }
                    }
                }
            })
    }

    _moveDropRowContainer(gestureState, options) {
        if (((gestureState.moveY + defaultDraggableHeight + scrollGutter) < Dimensions.get('window').height) &&
        ((gestureState.moveY - scrollGutter) > 0)){
            options.pan.setValue({
                x: 20,
                y: gestureState.moveY
            });
        }
        // if ((this.layoutMap.length > 0) || true) {
        let dropIndex = Math.ceil((gestureState.moveY - rowDropEnableHeight + this.totalScrollOffSet) / rowHeight);
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
        return (
            <View style={styles.container}>
                {this.getListView()}
                {
                    this.getDraggableContainerView({
                            pan: this.state.panValueMap,
                            panResponder: this._panResponderMap,//[index],
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
        this.totalScrollOffSet = e.nativeEvent.contentOffset.y;
    }

    _getDraggableContainerView(options) {
        let selectedCount = this._getSelectedCount();
        if (true) {
            console.log(options.pan)
            return (
                <Animated.View
                    style={[options.pan.getLayout(), styles.draggable, {
                        opacity: this.state.draggableOpacity,//Map[options.index],
                        height: this.state.draggableHeight,//(this.state.selectedRowIndex._value == -1) ?  Window.height : styles.draggable.height,
                        width: defaultDraggableWidth,//(this.state.selectedRowIndex._value == -1) ? 100 : styles.draggable.width,
                        //top: this.state.draggableTop
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
        var index = this._getRowIndexByY(touchYCoordinate + this.totalScrollOffSet);

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
        this.state.draggableOpacity.setValue(1)//Map[options.index].setValue(1)
        this.state.draggableHeight.setValue(defaultDraggableHeight)
        //this.state.draggableTop.setValue(e.touchHistory.touchBank[0].startPageY)
        this.state.panValueMap.setValue({
            x: 20,
            y: touchYCoordinate
        })

    }

    _getRowIndexByY(y) {
        var rowIndex = 0;
        for (var i = 0; i < this.layoutMap.length; i++) {
            if ((this.layoutMap[i].y <= y) && ((this.layoutMap[i].y + rowHeight) > y)) {
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
                    height: (index == this.state.currDropRowIndex) ? rowHeight + dropContainerHeight : rowHeight
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
        //  this.state.panValueMap[item.index].setValue(this._getDraggableDefaultPosition());
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
        height: defaultDraggableHeight
    },
    listItemContainer: {
        backgroundColor: 'rgb(230, 240, 240)',
        alignItems: 'flex-start',
        marginBottom: 2,
        paddingLeft: 5,
        height: rowHeight
    },
    rowDropContainer: {
        height: dropContainerHeight
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
