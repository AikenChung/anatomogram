"use strict";
//*------------------------------------------------------------------*

var React = require('react');
var validate = require('react-prop-types-check');
var Anatomogram = require('./Anatomogram.jsx');
var getSvgsForSpecies = require('./imagesAvailable.js').GetSvgsForSpecies;
var EventEmitter = require('events');
require('./ContainerLayout.less');

//*------------------------------------------------------------------*

var RequiredString = React.PropTypes.string.isRequired;

var argumentShape= {
    pathToFolderWithBundledResources: RequiredString,
    anatomogramData: React.PropTypes.shape({
      species: RequiredString,
      allSvgPathIds: React.PropTypes.arrayOf(RequiredString) //if not provided, we use properties read in from the file
    }).isRequired,
    expressedTissueColour: RequiredString,
    hoveredTissueColour: RequiredString,
    eventEmitter: React.PropTypes.instanceOf(EventEmitter)
};

var _availableAnatomograms= function(species, pathToFolderWithBundledResources, allSvgPathIds) {
  return (
    getSvgsForSpecies(pathToFolderWithBundledResources, species)
    .filter(function(e){
      return (
        ! allSvgPathIds
        ||  allSvgPathIds
            .filter(function(id){
              return e.ids.indexOf(id) > -1
            })
            .length > 0
      )
    })
  )
};

var callEmitterWhenMousedOverTissuesChange = function(eventEmitter){
  var forEachXNotInYsEmit = function(xs, ys, eventName){
    xs
    .filter(function(id){
      return ys.indexOf(id)==-1;
    })
    .forEach(function(id){
      eventEmitter.emit(eventName, id);
    });
  };

  return function emitEvents(nextIds,previousIds){
    forEachXNotInYsEmit(nextIds, previousIds, 'gxaAnatomogramTissueMouseEnter');
    forEachXNotInYsEmit(previousIds,nextIds, 'gxaAnatomogramTissueMouseLeave');
  }
};

var createAnatomogram = function(args){
  validate(args, argumentShape);

  var availableAnatomograms=
    _availableAnatomograms(
      args.anatomogramData.species,
      args.pathToFolderWithBundledResources,
      args.anatomogramData.allSvgPathIds || null);

  return(
    availableAnatomograms.length
      ? <Anatomogram
          pathToFolderWithBundledResources={args.pathToFolderWithBundledResources}
          expressedTissueColour={args.expressedTissueColour}
          hoveredTissueColour={args.hoveredTissueColour}
          availableAnatomograms= {availableAnatomograms}
          height={args.anatomogramData.species.indexOf("homo sapiens")>-1 ? 375 : 265}
          whenMousedOverIdsChange={
            args.whenMousedOverIdsChange
            || (
              args.eventEmitter
              ? callEmitterWhenMousedOverTissuesChange(args.eventEmitter)
              : function(){}
            )}
          idsExpressedInExperiment={args.idsExpressedInExperiment || args.ontologyIdsForTissuesExpressedInAllRows || []}
          idsToBeHighlighted={args.idsToBeHighlighted||[]}
          {...(args.anatomogramData.allSvgPathIds? {allSvgPathIds:args.anatomogramData.allSvgPathIds} :{})}/>
      : null
  );
};

//http://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript
var arraysEqual = function (a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

var makeWrapper = function(ComponentClass){
  return (
    React.createClass({
      displayName: "WrappedComponent",
      propTypes: {
        ontologyIdsToHighlight: React.PropTypes.arrayOf(React.PropTypes.string).isRequired,
        onOntologyIdIsUnderFocus: React.PropTypes.func.isRequired,
        componentProps: React.PropTypes.object.isRequired
      },
      shouldComponentUpdate: function(nextProps){
        return !arraysEqual(nextProps.ontologyIdsToHighlight,this.props.ontologyIdsToHighlight) ;
      },
      render: function(){
        return (
          <div id="gxaAnatomogramWrapper">
              <ComponentClass
                ontologyIdsToHighlight={this.props.ontologyIdsToHighlight}
                onOntologyIdIsUnderFocus={this.props.onOntologyIdIsUnderFocus}
                {...this.props.componentProps} />
          </div>
        );
      }
    })
  );
};
/**
anatomogramConfig: see argumentShape
componentClass : a React class to be wrapped. Should accept props onOntologyIdIsUnderFocus and ontologyIdsToHighlight
componentProps : other props to be passed over.
*/
var wrapComponentWithAnatomogram = function(anatomogramConfig, componentClass, componentProps){
  var Wrapped = makeWrapper(componentClass);
  return React.createClass({
    displayName: "AnatomogramComponentWrapper",
    getInitialState: function(){
      return {
        ontologyIdsForComponentContentUnderFocus: [],
        ontologyIdsForAnatomogramContentUnderFocus: []
      }
    },
    render: function(){
      return (
        <div>
            <div id="gxaAnatomogramAside">
                {createAnatomogram(
                  Object.assign({},
                    anatomogramConfig,
                    {
                      idsToBeHighlighted: this.state.ontologyIdsForComponentContentUnderFocus,
                      whenMousedOverIdsChange: function(nextIds){
                        this.setState({ontologyIdsForAnatomogramContentUnderFocus: nextIds});
                      }.bind(this)
                    })
                  )}
            </div>
            <Wrapped componentProps={componentProps}
              onOntologyIdIsUnderFocus={function(selectedIdOrIds){
                this.setState({ontologyIdsForComponentContentUnderFocus:
                  selectedIdOrIds
                  ? (typeof selectedIdOrIds === 'string'? [selectedIdOrIds] : selectedIdOrIds)
                  :[]})
              }.bind(this)}
              ontologyIdsToHighlight={this.state.ontologyIdsForAnatomogramContentUnderFocus}/>
        </div>
      )
    }
  })
};

//*------------------------------------------------------------------*
module.exports={"create": createAnatomogram, "wrapComponent": wrapComponentWithAnatomogram};
