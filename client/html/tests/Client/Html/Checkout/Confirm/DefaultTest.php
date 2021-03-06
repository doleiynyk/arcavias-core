<?php

/**
 * @copyright Copyright (c) Metaways Infosystems GmbH, 2013
 * @license LGPLv3, http://www.arcavias.com/en/license
 */

class Client_Html_Checkout_Confirm_DefaultTest extends MW_Unittest_Testcase
{
	private $_object;
	private $_context;


	/**
	 * Sets up the fixture, for example, opens a network connection.
	 * This method is called before a test is executed.
	 *
	 * @access protected
	 */
	protected function setUp()
	{
		$this->_context = TestHelper::getContext();
		$this->_context->setEditor( 'UTC001' );

		$paths = TestHelper::getHtmlTemplatePaths();
		$this->_object = new Client_Html_Checkout_Confirm_Default( $this->_context, $paths );
		$this->_object->setView( TestHelper::getView() );
	}


	/**
	 * Tears down the fixture, for example, closes a network connection.
	 * This method is called after a test is executed.
	 *
	 * @access protected
	 */
	protected function tearDown()
	{
		unset( $this->_object );
	}


	public function testGetHeader()
	{
		$this->_context->getSession()->set( 'arcavias/orderid', $this->_getOrderId() );

		$output = $this->_object->getHeader();
		$this->assertNotNull( $output );
	}


	public function testGetBody()
	{
		$this->_context->getSession()->set( 'arcavias/orderid', $this->_getOrderId() );

		$output = $this->_object->getBody();
		$this->assertStringStartsWith( '<section class="arcavias checkout-confirm">', $output );
	}


	public function testGetSubClientInvalid()
	{
		$this->setExpectedException( 'Client_Html_Exception' );
		$this->_object->getSubClient( 'invalid', 'invalid' );
	}


	public function testGetSubClientInvalidName()
	{
		$this->setExpectedException( 'Client_Html_Exception' );
		$this->_object->getSubClient( '$$$', '$$$' );
	}


	public function testProcess()
	{
		$this->_object->process();
	}


	protected function _getOrderId()
	{
		$manager = MShop_Factory::createManager( $this->_context, 'order' );
		$search = $manager->createSearch();
		$search->setConditions( $search->compare( '==', 'order.editor', 'core:unittest' ) );
		$search->setSlice( 0, 1 );
		$result = $manager->searchItems( $search );

		if( ( $order = reset( $result ) ) === false ) {
			throw new Exception( 'No order found' );
		}

		return $order->getId();
	}
}
