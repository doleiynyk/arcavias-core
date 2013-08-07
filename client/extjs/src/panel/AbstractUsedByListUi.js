/*!
 * Copyright (c) Metaways Infosystems GmbH, 2011
 * LGPLv3, http://www.arcavias.com/en/license
 * $Id: AbstractUsedByListUi.js 14829 2012-01-12 16:56:41Z nsendetzky $
 */


Ext.ns( 'MShop.panel' );

MShop.panel.AbstractUsedByListUi = Ext.extend( Ext.Panel, {

	/**
	 * @cfg {String} recordName (required)
	 */
	recordName: null,

	/**
	 * @cfg {String} idProperty (required)
	 */
	idProperty: null,

	/**
	 * @cfg {String} siteidProperty (required)
	 */
	siteidProperty: null,

	/**
	 * @cfg {String} itemUi xtype
	 */
	itemUiXType : null,

	/**
	 * @cfg {Object} sortInfo (optional)
	 */
	sortInfo: null,

	/**
	 * @cfg {String} autoExpandColumn (optional)
	 */
	autoExpandColumn: null,

	/**
	 * @cfg {Object} storeConfig (optional)
	 */
	storeConfig: null,

	/**
	 * @cfg {Object} gridConfig (optional)
	 */
	gridConfig: null,

	/**
	 * @cfg {String} parentIdProperty (required)
	 */
	parentIdProperty: null,

	/**
	 * @cfg {String} parentDomainPorperty (required)
	 */
	parentDomainPorperty: null,

	/**
	 * @cfg {String} parentRefIdProperty (required)
	 */
	parentRefIdProperty: null,

	layout: 'fit',

	initComponent : function()
	{
//		this.addEvents(
//			'afterLoad'
//		);
//		
//		this.on('afterLoad', this.afterLoad );
		
		this.initStore();

		this.listTypeStore = MShop.GlobalStoreMgr.get( this.recordName + '_Type', 'Product' );
		this.productTypeStore = MShop.GlobalStoreMgr.get( 'Product_Type', 'Product' );

		MShop.panel.AbstractUsedByListUi.superclass.initComponent.call( this );
	},
	
	initStore: function()
	{
		this.store = new Ext.data.DirectStore( Ext.apply( {
			autoLoad: false,
			remoteSort : true,
			hasMultiSort: true,
			fields: MShop.Schema.getRecord( this.recordName ),
			api: {
				read	: MShop.API[this.recordName].searchItems,
				create  : MShop.API[this.recordName].saveItems,
				update  : MShop.API[this.recordName].saveItems,
				destroy : MShop.API[this.recordName].deleteItems
			},
			writer: new Ext.data.JsonWriter( {
				writeAllFields: true,
				encode: false
			}),
			paramsAsHash: true,
			root: 'items',
			totalProperty: 'total',
			idProperty: this.idProperty,
			baseParams: {
				start: 0,
				limit: 2
			},
			sortInfo: this.sortInfo
		}, this.storeConfig ) );

		this.store.addEvents( 'afterload' );
		this.store.on( 'beforeload', this.onBeforeLoad, this );
		this.store.on( 'afterload', this.afterLoad, this ); //execute after list items were fetched
		this.store.on( 'exception', this.onStoreException, this );
		this.store.on( 'beforewrite', this.onBeforeWrite, this );
	},

	afterRender: function()
	{
		MShop.panel.AbstractUsedByListUi.superclass.afterRender.apply( this, arguments );

		this.ParentItemUi = this.findParentBy( function( c ) {
			return c.isXType( MShop.panel.AbstractItemUi, false );
		});

		if ( !this.store.autoLoad ) {
			this.store.load();
			this.store.fireEvent('afterload', this.store);
		}
		
		this.grid = new Ext.grid.GridPanel( Ext.apply( {
			border: false,
			store: this.store,
			autoExpandColumn: this.autoExpandColumn,
			columns: this.getColumns(),
			bbar: {
				xtype: 'MShop.elements.pagingtoolbar',
				store: this.store
			}
		}, this.gridConfig ) );

		this.grid.on( 'rowdblclick', this.onOpenEditWindow.createDelegate( this, ['edit']), this );
		this.add( this.grid );
	},
//	
//	afterLoad: function( store )
//	{
//		console.log('abstract');
//	},

	onBeforeLoad: function( store, options )
	{
		this.setSiteParam( store );

		if( this.domain ) {
			this.setDomainFilter( store, options );
		}

		var domainFilter = {};
		domainFilter[this.parentDomainPorperty] = 'product';

		var refIdFilter = {};
		
		refIdFilter[this.parentRefIdProperty] = null;
		if( this.ParentItemUi.record.data['product.id'] ) {
			refIdFilter[this.parentRefIdProperty] = this.ParentItemUi.record.data['product.id'];
		}
		
		options.params = options.params || {};
		options.params.condition = {
			'&&' : [ {
				 	'==' : domainFilter
				}, {
					'==' : refIdFilter
			} ]
		};
	},

	onBeforeWrite: function( store, action, records, options )
	{
		this.setSiteParam( store );

		if( this.domain ) {
			this.setDomainProperty( store, action, records, options );
		}
	},

	onDestroy: function()
	{
		this.store.un( 'beforeload', this.onBeforeLoad, this );
		this.store.un( 'beforewrite', this.onBeforeWrite, this );
		this.store.un( 'exception', this.onStoreException, this );
		this.store.un( 'afterload', this.afterLoad, this );

		MShop.panel.AbstractUsedByListUi.superclass.onDestroy.apply( this, arguments );
	},

	onStoreException: function( proxy, type, action, options, response )
	{
		var title = _( 'Error' );
		var msg = response && response.error ? response.error.message : _( 'No error information available' );
		var code = response && response.error ? response.error.code : 0;

		Ext.Msg.alert([title, ' (', code, ')'].join(''), msg);
	},

	setSiteParam: function( store )
	{
		store.baseParams = store.baseParams || {};
		store.baseParams.site = MShop.config.site["locale.site.code"];
	},

	setDomainFilter: function(store, options)
	{
		options.params = options.params || {};
		options.params.condition = options.params.condition || {};
		options.params.condition['&&'] = options.params.condition['&&'] || [];

		if( !this.domainProperty ) {
			this.domainProperty = this.idProperty.replace(/\..*$/, '.domain');
		}

		var condition = {};
		condition[this.domainProperty] = this.domain;

		options.params.condition['&&'].push( {'==': condition} );
	},

	setDomainProperty: function( store, action, records, options )
	{
		var rs = [].concat( records );

		Ext.each(rs, function( record ) {
			if( !this.domainProperty ) {
				this.domainProperty = this.idProperty.replace( /\..*$/, '.domain' );
			}
			record.data[this.domainProperty] = this.domain;
		}, this );
	},

	onOpenEditWindow: function( action ) {
		var record = this.grid.getSelectionModel().getSelected();
		var parentRecord = this.ParentItemUi.store.getById( record.data[this.parentIdProperty] );

		var itemUi = Ext.ComponentMgr.create( {
			xtype: this.itemUiXType,
			domain: this.domain,
			record: action === 'add' ? null : parentRecord,
			store: this.ParentItemUi.store,
			listUI: this
		} );

		itemUi.show();
	},

	listTypeColumnRenderer : function( listTypeId, metaData, record, rowIndex, colIndex, store, listTypeStore, displayField ) {

		var list = listTypeStore.getById( listTypeId );

		return list ? list.get( displayField ) : listTypeId;
	},

	statusColumnRenderer : function( listTypeId, metaData, record, rowIndex, colIndex, store, listTypeStore, displayField ) {

		var list = listTypeStore.getById( listTypeId );

	    metaData.css = 'statusicon-' + ( list ? Number( list.get( displayField ) ) : 0 );
	},

	productTypeColumnRenderer : function( typeId, metaData, record, rowIndex, colIndex, store, typeStore, productTypeStore, prodctId, displayField ) {

		var type = typeStore.getById( typeId );
		var productType = productTypeStore.getById( type.data[prodctId] );

		return productType ? productType.get( displayField ) : typeId;
	}
});
