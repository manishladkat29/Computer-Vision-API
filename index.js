'use strict';

const async = require('async');
const fs = require('fs');
const https = require('https');
const path = require("path");
const createReadStream = require('fs').createReadStream
const sleep = require('util').promisify(setTimeout);
const ComputerVisionClient = require('@azure/cognitiveservices-computervision').ComputerVisionClient;
const ApiKeyCredentials = require('@azure/ms-rest-js').ApiKeyCredentials;
const axios = require("axios")
const cors = require("cors");
const {check, body ,validationResult} = require('express-validator');



const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

var express = require('express');

const bodyParser = require("body-parser");
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

/**
 * AUTHENTICATE
 * This single client is used for all examples.
 */
const key = process.env.subskey;
console.log(key)

const endpoint = 'https://si-project-manish.cognitiveservices.azure.com/';

const computerVisionClient = new ComputerVisionClient(
  new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } }), endpoint);

const options = {
    swaggerDefinition: {
      info: {
        title: "Azure Computer Vision API",
        version: "1.0.0",
        description: "Azure Computer Vision API autogenerated by Swagger",
      },
      host: "104.236.17.224:8083",
      basePath: "/",
    },
    apis: ["./index.js"],
  };

const specs = swaggerJsdoc(options);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));


/**
 * @swagger
 * definitions:
 *   url:
 *     properties:
 *       url:
 *         type: string
 */
/**
 * @swagger
 * /detectTags:
 *    post:
 *      description: Detect Tags from Image
 *      produces:
 *          - application/json
 *      responses:
 *          200:
 *              description: Add data
 *          422:
 *              description: Errors in input object
 *      parameters:
 *          - name: url
 *            description: url of the image
 *            in: body
 *            required: true
 *            schema:
 *              $ref: '#/definitions/url'
 *
 */

app.post('/detectTags', [check('url').isURL().withMessage('URL should be valid')], (req, res) => {
    var errors= validationResult(req);
    if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() })      
    }else{
        res.setHeader("Content-Type","application/json");
        const turl = req.body.url;
        console.log("URl : " + turl)

        async.series([
            async function () {
                console.log('-----------------------------------------------');
                console.log('DETECT TAGS');
                // Analyze URL image
                const tagsURL = turl;
                console.log('Analyzing tags in image...', tagsURL.split('/').pop());
                const tags = (await computerVisionClient.analyzeImage(tagsURL, { visualFeatures: ['Tags'] })).tags;
                console.log(tags)
                console.log(`Tags: ${formatTags(tags)}`);
                res.status(200).json(tags)

                // Format tags for display
                function formatTags(tags) {
                    return tags.map(tag => (`${tag.name} (${tag.confidence.toFixed(2)})`)).join(', ');
                }
            },
            function () {
                return new Promise((resolve) => {
                    resolve();
                })
            }
        ], (err) => {
            throw (err);
            res.status(422).json(err)
        });   
    }
})


/**
 * @swagger
 * definitions:
 *     url:
 *        type: string
 */

/**
 * @swagger
 * /readText:
 *    post:
 *      description: Read Text from Image
 *      produces:
 *          - application/json
 *      responses:
 *          200:
 *              description: Add data
 *          422:
 *              description: Errors in input object
 *      parameters:
 *          - name: url
 *            description: url of the image
 *            in: body
 *            required: true
 *            schema:
 *              $ref: '#/definitions/url'
 *
 */

app.post('/readText', [check('url').isURL().withMessage('URL should be valid')], (req, res) => {
    var errors= validationResult(req);
    if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() })      
    }else{
        res.setHeader("Content-Type","application/json");
        const turl = req.body.url;
        console.log("URl : " + turl)

        async.series([
            async function () {
                console.log('-----------------------------------------------');
                console.log('Read Text');


                // Status strings returned from Read API. NOTE: CASING IS SIGNIFICANT.
                // Before Read 3.0, these are "Succeeded" and "Failed"
                const STATUS_SUCCEEDED = "succeeded";
                const STATUS_FAILED = "failed"

                // Image of different kind of dog.
                // const tagsURL = 'https://moderatorsampleimages.blob.core.windows.net/samples/sample16.png';

                // Analyze URL image
                const textURL = turl;
                // Recognize text in printed image from a URL
                console.log('Read printed text from URL...', textURL.split('/').pop());
                const printedResult = await readTextFromURL(computerVisionClient, textURL);

                console.log("Printed Result:" + printedResult)


                console.log('Recognized text:');
                let flag = "False"
                for (const page in printedResult) {
                    if (printedResult.length > 1) {
                      console.log(`==== Page: ${page}`);
                    }
                    const result = printedResult[page];
                    if (result.lines.length) {
                        for (const line of result.lines) {
                            console.log(line.words.map(w => w.text).join(' '));
                        }
                    }
                    else { 
                        console.log('No recognized text.'); 
                        flag = "True"
                    }
                }
                if(flag == "True"){
                    res.status(200).json({'Text':'No recognized text'})
                }
                else{
                    res.status(200).json(printedResult)    
                }

                // Perform read and await the result from URL
                async function readTextFromURL(client, url) {
                    // To recognize text in a local image, replace client.read() with readTextInStream() as shown:
                    let result = await client.read(url);
                    // Operation ID is last path segment of operationLocation (a URL)
                    let operation = result.operationLocation.split('/').slice(-1)[0];

                    // Wait for read recognition to complete
                    // result.status is initially undefined, since it's the result of read
                    while (result.status !== STATUS_SUCCEEDED) { 
                        await sleep(1000); result = await client.getReadResult(operation); 
                    }
                    return result.analyzeResult.readResults; // Return the first page of result. Replace [0] with the desired page if this is a multi-page file such as .pdf or .tiff.
                }
            },
            function () {
                return new Promise((resolve) => {
                    resolve();
                })
            }
        ], (err) => {
            throw (err);
        });   
    }
})


/**
 * @swagger
 * definitions:
 *     url:
 *        type: string
 */

/**
 * @swagger
 * /detectImageType:
 *    post:
 *      description: Detect Type of Image
 *      produces:
 *          - application/json
 *      responses:
 *          200:
 *              description: Add data
 *          500:
 *              description: Data already exists
 *          422:
 *              description: Errors in input object
 *      parameters:
 *          - name: url
 *            description: url of the image
 *            in: body
 *            required: true
 *            schema:
 *              $ref: '#/definitions/url'
 *
 */
app.post('/detectImageType', [check('url').isURL().withMessage('URL should be valid')], (req, res) => {
    var errors= validationResult(req);
    if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() })      
    }else{
        res.setHeader("Content-Type","application/json");
        const turl = req.body.url;
        console.log("URl : " + turl)

        async.series([
            async function () {
                console.log('-----------------------------------------------');
                console.log('Detect Image Type');
                const typeURLImage = turl;
                console.log('Analyzing type in image...', typeURLImage.split('/').pop());
                const types = (await computerVisionClient.analyzeImage(typeURLImage, { visualFeatures: ['ImageType'] })).imageType;
                console.log(`Image appears to be ${describeType(types)}`);
                res.status(200).json({'ImageType':describeType(types)})

                function describeType(imageType) {
                    if (imageType.clipArtType && imageType.clipArtType > imageType.lineDrawingType) return 'clip art';
                    if (imageType.lineDrawingType && imageType.clipArtType < imageType.lineDrawingType) return 'a line drawing';
                    return 'a photograph';
                }
            },
            function () {
                return new Promise((resolve) => {
                    resolve();
                })
            }
        ], (err) => {
            throw (err);
        });
    }  
})


/**
 * @swagger
 * /getImageDescription:
 *    post:
 *      description: Gets the list of generated captions for the image
 *      produces:
 *          - application/json
 *      responses:
 *          200:
 *              description: detailed description of the image with confidence score
 *          500:
 *              description: incorrect url
 *      parameters:
 *          - name: url
 *            description: Request object
 *            in: body
 *            required: true
 *            schema:
 *              $ref: '#/definitions/url'
 *
 */

app.post("/getImageDescription", [check('url').isURL().withMessage('URL should be valid')], async (req, res, next) => {
    var errors= validationResult(req);
    if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() })      
    }else{
        let url = req.body.url;
        var caption;
        await async.series(
        [
          async function () {
            const describeURL = url;
            console.log(
              "Analyzing URL image to describe...",
              describeURL.split("/").pop()
            );
            caption = (await computerVisionClient.describeImage(describeURL))
              .captions[0];
            console.log(
              `This may be ${caption.text} (${caption.confidence.toFixed(
                2
              )} confidence)`
            );
            res.status(200).json(caption);
          },
          function () {
            return new Promise((resolve) => {
              resolve();
            });
          },
        ],
        (err) => {
          throw err;
        }
  );
    }
});



var server = app.listen(8083, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port)
})






