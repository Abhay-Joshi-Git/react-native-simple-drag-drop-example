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
import reactMixin from 'react-mixin';
import timerMixin from 'react-timer-mixin';

//should be called on render rather than caching the value, it may change e.g. due to rotation
let Window = Dimensions.get('window');
const rowHeight = 60;
const dropContainerHeight = 40;
const rowDropEnableHeight = rowHeight / 2;
const draggableHeight = 30;
const scrollOffset = 2;
const scrollGutter = 10;

updatedData = data.map((item, index) => {
    return {
        ...item,
        index: index
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
            pan: new Animated.ValueXY({
                x: 10,
                y: Window.height - 60
            }),
            prevDropRowIndex: -1,
            currDropRowIndex: -1
        }
        this._panResponderCreate();
        this.layoutMap = [];
        this._bindFunctions();
        this.totalScrollOffSet = 0;
    }

    _moveDropRowContainer(gestureState) {
        this.state.pan.setValue({
            x: gestureState.moveX,
            y: gestureState.moveY
        });
        if ((this.layoutMap.length > 0) ) {
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
        } else if (this.state.currDropRowIndex != -1) {
            this.setState({
                prevDropRowIndex: -1,
                currDropRowIndex: -1,
                dataSource: this.state.dataSource.cloneWithRows(updatedData)
            })
        }
    }

    _panResponderCreate() {
        this._panResponder = PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (e, gestureState) => {
                var scrollDown = (gestureState.moveY + draggableHeight + scrollGutter) > Dimensions.get('window').height;
                var scrollUp = ((gestureState.moveY - scrollGutter) < 0) && (this.totalScrollOffSet > 0);
                if (scrollDown || scrollUp) {
                    if (!this._autoScrollingInterval) {
                        this._autoScrollingInterval =  this.setInterval(() => {
                            this.totalScrollOffSet += scrollDown ? scrollOffset : (-scrollOffset);
                            this.listView.scrollTo({
                                y: this.totalScrollOffSet,
                                animated: true
                            });
                            this.moveDropRowContainer(gestureState);
                        }, 20);
                    }
                    return;
                } else if (this._autoScrollingInterval) {
                    clearInterval(this._autoScrollingInterval);
                    this._autoScrollingInterval = null;
                }
                this.moveDropRowContainer(gestureState);
            },
            onPanResponderStart: (e, gestureState) => {
                this.state.pan.setOffset({
                    x: -e.nativeEvent.locationX,
                    y: -e.nativeEvent.locationY
                });
            },
            onPanResponderRelease: () => {
                if (this._autoScrollingInterval) {
                    clearInterval(this._autoScrollingInterval);
                    this._autoScrollingInterval = null;
                }
            }
        });
    }

    _bindFunctions() {
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
                    ref={el => {this.listView = el}}
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

    _renderRow(item, section, index) {
        return (
            <View
                style={{
                    flex: 1,
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
