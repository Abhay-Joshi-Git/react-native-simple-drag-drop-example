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
const draggableHeight = 30;
var scrollOffset = 2;
const scrollGutter = 10;

const defaultAnimatedOpacity = 0; //for experimets

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
            //pan: new Animated.ValueXY(this._getDraggableDefaultPosition()),
            layoutMap: this._getDefaultLayout(),
            panValueMap: this._getDefaultPanValueMap(),
            prevDropRowIndex: -1,
            currDropRowIndex: -1,
            selectedRowIndex: new Animated.Value(-1),
            animatedOpacityMap: this._getAnimatedOpacityMap()
        }

        this._responderCreate();

        this.layoutMap = [];
        this._bindFunctions();
        this.totalScrollOffSet = 0;
    }

    _responderCreate() {
        this._draggablePanResponderCreate();
        this._listViewPanResponderCreate();
        this._listViewItemPanResponderCreate();
    }

    _getDefaultLayout() {
        var defaultWidth = 100;
        var defaultHeight = 80;
        return updatedData.map(item => {
            return {
                width: defaultWidth,
                height: defaultHeight
            }
        })
    }

    _getDefaultPanValueMap() {
        return updatedData.map((item, index) => {
            return new Animated.ValueXY({
                x: 20,
                y: (index + 1) * 100
            })
        })
    }

    _getAnimatedOpacityMap() {
        return updatedData.map((item, index) => {
            return new Animated.Value(defaultAnimatedOpacity)
        })
    }

    _getDraggableDefaultPosition() {
        return {
            x: 10,
            y: Window.height - 60
        };
    }

    _draggablePanResponderCreate() {
        this._panResponderMap = updatedData.map(item => {
            return PanResponder.create({
                onStartShouldSetPanResponder: () => {
                    return true
                },
                onMoveShouldSetPanResponder: () => {
                    return ((this.state.selectedRowIndex._value != -1))
                },
                onMoveShouldSetPanResponderCapture: () => {
                    return ((this.state.selectedRowIndex._value != -1))
                },
                onStartShouldSetPanResponderCapture: () => {
                    return (this.state.selectedRowIndex._value != -1)
                },
                onPanResponderMove: (e, gestureState) => {
                    var scrollDown = (gestureState.moveY + draggableHeight + scrollGutter) > Dimensions.get('window').height;
                    var scrollUp = ((gestureState.moveY - scrollGutter) < 0) && (this.totalScrollOffSet > 0);
                    if (scrollDown || scrollUp) {
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
                                    pan: this.state.panValueMap[item.index]
                                });
                            }, 20);
                        }
                        return;
                    } else if (this._autoScrollingInterval) {
                        clearInterval(this._autoScrollingInterval);
                        this._autoScrollingInterval = null;
                    }
                    this.moveDropRowContainer(gestureState, {
                        pan: this.state.panValueMap[item.index]
                    });
                },
                onPanResponderStart: (e, gestureState) => {
                    console.log('pan responder start - ', e.nativeEvent);
                    this.state.panValueMap[item.index].setOffset({
                        x: 0,
                        y: -e.nativeEvent.locationY
                    });
                },
                onPanResponderRelease: () => {
                    if (this._autoScrollingInterval) {
                        clearInterval(this._autoScrollingInterval);
                        this._autoScrollingInterval = null;
                    }
                }
            })
        })
    }

    _moveDropRowContainer(gestureState, options) {
        if (((gestureState.moveY + draggableHeight + scrollGutter) < Dimensions.get('window').height) &&
        ((gestureState.moveY - scrollGutter) > 0)){
            options.pan.setValue({
                x: gestureState.moveX,
                y: gestureState.moveY
            });
        }
        if ((this.layoutMap.length > 0) || true) {
                //TODO - implement on the basis of layoutMap or get row present on the top
                let dropIndex = Math.ceil((gestureState.moveY - rowDropEnableHeight + this.totalScrollOffSet) / rowHeight);
                if ((this.state.currDropRowIndex != dropIndex) ||
                   (this.state.currDropRowIndex != this.state.prevDropRowIndex)) {
                   this.setState({
                       prevDropRowIndex: this.state.currDropRowIndex,
                       currDropRowIndex:  dropIndex,
                       dataSource: this.state.dataSource.cloneWithRows(updatedData)
                   })
                }
        }
        else if (this.state.currDropRowIndex != -1) {
            this.setState({
                prevDropRowIndex: -1,
                currDropRowIndex: -1,
                dataSource: this.state.dataSource.cloneWithRows(updatedData)
            })
        }
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
    }

    render() {
        return (
            <View style={styles.container}>
                {this.getListView()}
                {updatedData.map((item, index) => {
                    return this.getDraggableContainerView({
                            pan: this.state.panValueMap[index],
                            panResponder: this._panResponderMap[index],
                            index: index
                        })
                })}

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
                />
            </View>
        )
    }

    _getDraggableContainerView(options) {
        let selectedCount = this._getSelectedCount();
        if (true) {
            console.log(options.pan)
            return (
                <Animated.View
                    style={[options.pan.getLayout(), styles.draggable, {
                        opacity: this.state.animatedOpacityMap[options.index],
                        width: this.state.layoutMap[options.index] ?
                            this.state.layoutMap[options.index].width :
                            styles.draggable.width
                    }]}
                    {...options.panResponder.panHandlers}
                     ref={(el) => {this._draggableElement = el}}
                     key={options.index}
                >
                    <TouchableHighlight
                        onLongPress={() => {
                            this.setState({
                                someText: 'changed in draggable long press'
                            })
                            this.state.selectedRowIndex.setValue(options.index)
                            this.state.animatedOpacityMap[options.index].setValue(1)
                        }}
                        style={{height: 80}}
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
                        backgroundColor: item.selected ? 'grey' : 'rgb(230, 240, 240)',
                        opacity: (this.state.selectedRowIndex._value == item.index) ? 0.1: 1
                    }
                ]}
                onLongPress={() => {
                    this._onRowLongPress(item)
                }}
                onPressOut={() => {
                    this._onRowPressOut(item)
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
                            name: {this.state.text}
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
        // let layout = this.layoutMap[item.index];
        // if (selectedCount <= 0) {
        //     let pan = this.state.panValueMap[item.index];
        //     pan.setValue({
        //         x: pan.x._value,
        //         y: layout.y + (rowHeight /2) - (draggableHeight/2)
        //     });
        // }
        this.state.selectedRowIndex.setValue(itemIndex)
        this.state.animatedOpacityMap[itemIndex].setValue(1)
        this.setState({
            dataSource: this.state.dataSource.cloneWithRows(updatedData),
        });
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
        //this.layoutMap[index] = e.nativeEvent.layout

        if (this.state.selectedRowIndex._value == -1) {
            this.state.panValueMap[index].setValue({
                x: e.nativeEvent.layout.x,
                y: e.nativeEvent.layout.y
            });
            // this.setState({
            //     layoutMap: [
            //         ...this.state.layoutMap.slice(0, index),
            //         {
            //             width: e.nativeEvent.layout.width,
            //             height: e.nativeEvent.layout.height
            //         },
            //         ...this.state.layoutMap.slice(index + 1, this.state.layoutMap.length)
            //     ]
            // })
        }
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
        height: draggableHeight
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
