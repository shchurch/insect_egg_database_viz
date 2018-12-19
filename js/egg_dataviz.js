// height and width of the egg_scatterplot
var egg_scatterplot_object, legend_object, eggScalex, eggScaley, eggAxisx, eggAxisy, eggAxisy_svg, eggAxisx_svg; 
var egg_scatterplot_w = 600;
var egg_scatterplot_h = 600;
var svg_buf = 40; //pixels outside of main graph space that are included in the svg
var text_search = document.getElementById("input_search");

var searchable_cols = ["group", "family", "superfamily", "subfamily", "suborder", "order", "tribe", "genus", "species", "name"];
var searchable_set = new Set([]);

// list of empty type cells in database
var empty_things = {'':true, 'NA':true, 'na':true, 'missing': true, 'none': true, "": true};

// whole egg database
var egg_database;

// dictionary of colors by group
var color = d3.scale.ordinal()
  .domain(["Hymenoptera","Condylognatha","Antliophora","Neuropteroidea","Amphiesmenoptera","Polyneoptera","Palaeoptera","Apterygota","Psocodea"])
  .range(["#BE0000","#2E9B00","#2056CE","#E87425","#22CED5","#3A175F","#F2C406","#D454E2","#878787"]);

// dictionary of data types
var variable_dict = {"txtX2": "Width (mm)", 
                    "txtX1": "Length (mm)", 
                    "curv": "Angle of curvature (rad)",
                    "asym": "Asymmetry",
                    "txtvol": "Volume (mm3)",
                    "txtar": "Aspect ratio",
                    "logtxtX2": "Width (mm) - log10 scale", 
                    "logtxtX1": "Length (mm) - log10 scale", 
                    "logtxtvol": "Volume (mm3) - log10 scale", 
                    "logtxtar": "Aspect Ratio - log10 scale", 
                    "sqasym": "Asymmetry - square root scale" , 
                    "sqcurv": "Angle of curvature (rad) - square root scale"};

// image tooltip div
var div = d3.select("#div_container").append("div")  
    // referred to as image_tooltip
    .attr("class", "image_tooltip")   
    // usually invisible            
    .style("opacity", 0);

// minitext div in image tooltip
var minitext = div.append("div")
    .attr("id","minitext")
    .attr("class","minitext");
var minisource = div.append("div")
    .attr("id","minisource")
    .attr("class","minitext");

var mini_xbox = div.append("img")
    .attr("id", "mini_xbox")
    .attr("src", "./x_icon.svg")
    .attr("width", 25)
    .attr("height", 25)
    .on("click", function() {
        if (minipic_locked) {
            reset_focus();
            minipic_locked = false;
            div.transition()        
                .duration(500)      
                .style("opacity", 0);
            minipic.attr("src",'pics/tinytrans.gif');
            mini_xbox.style("display", "none");
        }
    });

// minipic div in image tooltip
var minipic_div = div.append("div")
    .attr("class","minipic_div");

// image inside minipic div
var minipic = minipic_div.append("img")
    .attr("id","minipic");

var minipic_locked = false;

// scatterplot axes
var x_key, y_key;

// limits
var low_lim = 0
var high_lim = 17

var low_lim_log = -2.2
var high_lim_log = 1.7

var low_ar = 0;
var high_ar = 30;
var low_logar = -0.75;
var high_logar = 1.5;

var low_vol = 0;
var high_vol = 500;
var low_logvol = -6.5;
var high_logvol = 3;

var low_asym = 0;
var high_asym = 1.5;
var low_sqasym = 0;
var high_sqasym = 1.25;

var low_curv = 0;
var high_curv = 3.5;
var low_sqcurv = 0;
var high_sqcurv = 1.9;

var transform_dict = {"txtX1": "logtxtX1", 
                    "txtX2": "logtxtX2",  
                    "asym": "sqasym",  
                    "curv": "sqcurv",  
                    "txtvol": "logtxtvol",  
                    "txtar": "logtxtar",
                    "clade": "clade"};

function change_color() {
    var var_color = d3.select('#color_select').property("value");
    var var_key = transform_dict[var_color];

    make_legend();

    var colours = ["#440154","#481568","#482677","#453781","#3F4788","#32648E","#2D718E","#287D8E","#238A8D","#1F968B","#20A386"
    ,"#29AF7F","#3CBC75","#56C667","#74D010","#94D840","#B8DE29"
    ,"#DCE318","#FDE725"];

    var heatmapColour = d3.scale.linear()
      .domain(d3.range(0, 1, 1.0 / (colours.length - 0)))
      .range(colours);

    if(var_color == "clade") {
        egg_scatterplot_object.selectAll(".egg_point")
            .style("fill", function(d) { return color(d["group"])
        });
    } else {
        color_lims = get_lims(var_color,false)
        var color_scale = d3.scale.linear()
            .domain([color_lims[0],color_lims[1]])
            .range([0,1]);
        egg_scatterplot_object.selectAll(".egg_point")
            .style("fill", function(d) {
                if(d[var_key] == "NA") {
                    return "#cccccc";
                } else {
                    d3.select(this).moveToFront()
                    return heatmapColour(color_scale(d[var_key]));
                }
        }); 
    }
}
    

function set_axes(low_x,high_x,low_y,high_y) {
    
    eggScalex = d3.scale.linear()
        .range([svg_buf,egg_scatterplot_w-svg_buf])
        .domain([low_x,high_x]);
    eggScaley = d3.scale.linear()
        .range([svg_buf,egg_scatterplot_h-svg_buf])
        .domain([high_y,low_y]);

    eggAxisx = d3.svg.axis()
        .scale(eggScalex);
    eggAxisy = d3.svg.axis()
        .scale(eggScaley)
        .orient("left");

    eggAxisx_svg.call(eggAxisx
        .ticks(10).tickSize(-egg_scatterplot_h + svg_buf*2,0).orient("bottom")
        .tickFormat(function(d) { 
            if (x_key == 'logtxtvol') {
                return d3.format("1e")(Math.pow(10, d));
            } else if (x_key.slice(0,2) == 'sq') {
                return Math.pow(d,2).toFixed(2);
            } else if (x_key.slice(0,3) == 'log') {
                return Math.pow(10,d).toFixed(2);
            } else {
                return d;
            }
        }));
    eggAxisy_svg.call(eggAxisy
        .ticks(10).tickSize(-egg_scatterplot_w + svg_buf*2,0).orient("left")
        .tickFormat(function(d) { 
            if (y_key == 'logtxtvol') {
                return d3.format("1e")(Math.pow(10, d));
            } else if (y_key.slice(0,2) == 'sq') {
                return Math.pow(d,2).toFixed(2);
            } else if (y_key.slice(0,3) == 'log') {
                return Math.pow(10,d).toFixed(2);
            } else {
                return d;
            }
        })); 
    
    egg_scatterplot_object.selectAll(".egg_point")   
        .transition()
        .duration(1000)
        .attr("cy", function(d) {
            if (d[y_key] in empty_things) { 
                return 0;
            } else {
                return eggScaley(parseFloat(d[y_key]));
            } 
        })
        .attr("cx", function(d) {
            if (d[x_key] in empty_things) { 
                return 0;
            } else {
                return eggScalex(parseFloat(d[x_key]));
            }
        });

    d3.select("#x_title")
        .text(variable_dict[x_key]);
    d3.select("#y_title")
        .text(variable_dict[y_key]);
}

function get_lims(variable, transform) {
    if(variable == "txtX1" | variable == "txtX2") {
        if(transform == true){
            low = low_lim
            high = high_lim
        } else {
            low = low_lim_log
            high = high_lim_log
        }
    } else if(variable == "txtvol") {
        if(transform == true){
            low = low_vol
            high = high_vol
        } else {
            low = low_logvol
            high = high_logvol
        }
    } else if(variable == "txtar") {
        if(transform == true){
            low = low_ar
            high = high_ar
        } else {
            low = low_logar
            high = high_logar
        }
    } else if(variable == "asym") {
        if(transform == true){
            low = low_asym
            high = high_asym
        } else {
            low = low_sqasym
            high = high_sqasym
        }
    } else if(variable == "curv") {
        if(transform == true){
            low = low_curv
            high = high_curv
        } else {        
            low = low_sqcurv
            high = high_sqcurv
        }
    }
    return [low, high]
}

function change_axes() {
    var var_x = d3.select("#x_axis_select").property("value");
    var var_y = d3.select("#y_axis_select").property("value");
    not_transformed = document.getElementById("transform_slider").checked;
    if (not_transformed) {
        x_key = var_x;
        y_key = var_y;
    } else {
        x_key = transform_dict[var_x];
        y_key = transform_dict[var_y];
    }
    
    var x_lims = get_lims(var_x, not_transformed);
    var y_lims = get_lims(var_y, not_transformed);

    set_axes(x_lims[0],x_lims[1],y_lims[0],y_lims[1]);

    check_display();
    
}


d3.selection.prototype.moveToFront = function() {  
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};


function check_display() {
    egg_scatterplot_object.selectAll(".egg_point")
        .style("display",function (d) {
            if ((d[x_key] in empty_things) || (d[y_key] in empty_things)) { 
                return "none";
            } else {
                return d3.select(this).attr("base_display");
            }
        });
}


function highlight_from_click(text_to_use) {
    text_search.value = text_to_use;
    only_show_some();
}


function only_show_some() {
    var pshow = d3.select("#only_show_pics").property('checked');
    var hshow = d3.select("#only_show_high").property('checked');
    var highlight = text_search.value;
    if ((!hshow) && highlight != "") { 
         egg_scatterplot_object.selectAll(".egg_point")
            .style("stroke",function (d) {
                for (let c=0; c<searchable_cols.length; c++) {
                    if (d[searchable_cols[c]] == highlight) {
                        d3.select(this).moveToFront()
                        return "black";
                    }
                }
            })
            .style("opacity",function (d) {
                for (let c=0; c<searchable_cols.length; c++) {
                    if (d[searchable_cols[c]] == highlight) {
                        d3.select(this).moveToFront()
                        return "1";
                    }
                }
            });
    } else {
        egg_scatterplot_object.selectAll(".egg_point")
            .style("stroke","none")
            .style("opacity", 1)
    }; 
    
    egg_scatterplot_object.selectAll(".egg_point")
        .attr("base_display",function (d) {
            var p_is_there = "block";
            if(d["image"] in empty_things) {
                p_is_there = "none";
            }
            if (hshow && (highlight != "")) {
                var h_is_there = "none";
                for (let c=0; c<searchable_cols.length; c++) {
                    if (d[searchable_cols[c]] == highlight) {
                        h_is_there = "block";
                    }
                }
                if (!pshow) {
                    return h_is_there;
                } else {
                    if (p_is_there == "block") {
                        return h_is_there;
                    } else {
                        return "none";
                    }
                }
            } else {
                if (pshow) {
                    return p_is_there;
                } else {
                    return "block";
                }
            }
        });
    
    check_display();
    
}

function reset_focus(){
    egg_scatterplot_object.selectAll(".egg_point")
        .style("stroke", "none")
        .style("stroke-width", 2)
        .attr("r", function(d) { return d3.select(this).attr("base_r") });
}

function imageExists(image_url){
    // check if an image file is found
    var http = new XMLHttpRequest()
    http.open("HEAD", image_url, false)
    http.send()

    return http.status != 404;
}

function make_legend() {
    var var_color = d3.select('#color_select').property("value");
    var var_key = transform_dict[var_color];


    var legend;

    var colours = ["#440154", "#482878", "#3E4A89", "#31688E", "#26828E", "#1F9E89", 
    "#35B779", "#6DCD59", "#B4DE2C", "#FDE725"];

    var heatmapColour = d3.scale.linear()
        .domain(d3.range(0, 1, 1.0 / (colours.length - 0)))
        .range(colours);
    
    legend_object.html(null); // deletes all previous legend elements

    if(var_color == "clade") {

        legend = legend_object.selectAll(".legend")
            .data(color.domain())
            .enter()
            .append("g")
                .attr("class", "clade_legend_element")
                .attr("transform", function (d, i) { return "translate(20," + i * 25 + ")"; })
                .on("click", function(d) {
                        highlight_from_click(d)
                    });;

        legend.append("circle")
                .attr("class","legend_circle")
                .attr("cx",13)
                .attr("cy",14)
                .attr("r", 6)
                .attr("fill", color);

        legend.append("text")
                .attr("fill","#000000")
                .attr("x",30)
                .attr("y",14)
                .attr("dy", ".35em")
                .text(function(d) { return d; }); 
    } else {
        legend_object.selectAll("g")
            .attr("display","none");

        var color_lims = get_lims(var_color,false)

        var color_scale = d3.scale.linear()
            .range([color_lims[0],color_lims[1]])
            .domain([0,1]);

        legend = legend_object.selectAll(".legend")
            .data(heatmapColour.domain())
            .enter().append("g")
            .attr("transform", function (d, i) { return "translate(20," + i * 25 + ")"; });

        legend.append("rect")
                .attr("x",10)
                .attr("y",2)
                .attr("width", 30)
                .attr("height", 25)
                .attr("fill", heatmapColour);

        legend.append("text")
                .attr("fill","#000000")
                .attr("x",50)
                .attr("y",15)
                .attr("dy", ".35em")
                .text(function(d) {
                    if (var_key == 'logtxtvol') {
                        return d3.format(".1e")(Math.pow(10, color_scale(d)));
                    } else if (var_key.slice(0,2) == 'sq') {
                        return Math.pow(color_scale(d),2).toFixed(2);
                    } else if (var_key.slice(0,3) == 'log') {
                        return Math.pow(10,color_scale(d)).toFixed(2);
                    } else {
                        return d;
                    }
                });  
    }      
}

function show_image_tooltip(datum) {
    // build the text box next to the point
    minitext.html( "<i>" + datum["genus"] + " " + datum["species"] + "</i>");

    var source = "data/bibliography_formatted.csv";
    var bibkeys = {};
    d3.tsv(source, (bibdata) => {
        bibdata.map(d => {
            bibkeys[d["bibkey"]] = d["reference"];
            return bibkeys;   
        });
        minisource.html(bibkeys[datum["bibtex"]])    
    });

    // this is the name of the picture file
    var picturename = "ID" + datum["ID"] + ".png"
    var urlname = "pics/Entry_PNGs_cropped/" + picturename;
    // check if it is real
    var img_flag = imageExists(urlname);

    // transition in the image tooltip div
    div.transition()        
        .duration(20)   
        .style("opacity", 1.0);

    if(img_flag) {
        // if the image is present, show the pic
        minipic.style("opacity",1)
        minipic.attr("src",urlname);

    } else {
        // otherwise just show the text
        minipic.style("opacity",0);

    }
    
}

function make_egg_scatterplot() {
    
    // set up the axes
    eggAxisx_svg = egg_scatterplot_object.append("g")
        .attr("id", "x_axis")
        .attr("class", "my_axis")
        .attr("transform", "translate(0," + String(egg_scatterplot_h-svg_buf) + ")");
        
    eggAxisy_svg = egg_scatterplot_object.append("g")
        .attr("id", "y_axis")
        .attr("class", "my_axis")
        .attr("transform", "translate(" + String(svg_buf) + ", 0)");

    egg_scatterplot_object.append("rect")
        .attr("id", "scatter_border")
        .attr("x",svg_buf)
        .attr("y",svg_buf)
        .attr("width",egg_scatterplot_w - svg_buf*2)
        .attr("height",egg_scatterplot_h - svg_buf*2);

    // build all of the points using d3
    egg_scatterplot_object.selectAll(".egg_point")
        .data(egg_database)
        .enter()
        // add points for each egg description
        .append("circle")
            .attr("class", "egg_point")
            // set the fixed qualities of the points
            .attr("stroke-width", 2)
            .attr("opacity", 1)
            .attr("base_display", "block")
            // color the points by group
            .style("fill", function(d) { return color(d["group"])
            })
            // determine the size of the points based on image
            .attr("base_r", function(d) {
                if(d["image"] in empty_things) {
                    return 2.5;
                } else {
                    d3.select(this).moveToFront()
                    return 4;
                }
            })
            .attr("r", function(d) { return d3.select(this).attr("base_r") })
            // set up the mouseover image_tooltip
            .on("mouseover", function(d){
                if (!minipic_locked) {
                    show_image_tooltip(d);
                }
            })
            // make the image_tooltip div go away when you mouseout
            .on("mouseout", function(d){
                if (!minipic_locked) {
                    div.transition()        
                        .duration(500)      
                        .style("opacity", 0);
                    minipic.attr("src",'pics/tinytrans.gif');
                }
            })
            .on("click", function(d){
                text_search.value = "";
                if (!minipic_locked) {
                    show_image_tooltip(d);
                    reset_focus();
                    d3.select(this).attr('r', 6);
                    d3.select(this).style("stroke", 'black');
                    d3.select(this).style("stroke-width", 3);
                    minipic_locked = true;
                    mini_xbox.style("display", "block");
                    d3.select(this).moveToFront()
                } else {
                    reset_focus();
                    minipic_locked = false;
                    div.transition()        
                    .duration(500)      
                    .style("opacity", 0);
                    minipic.attr("src",'pics/tinytrans.gif');
                    mini_xbox.style("display", "none");                    
                }
            });
    
    change_axes();

    var new_lims_mousedown = '';
    var new_lims_mouseup = '';
    egg_scatterplot_object.on('mousedown',function(){
        new_lims_mousedown = d3.mouse(this)
    });

    egg_scatterplot_object.on('mouseup',function(){
        new_lims_mouseup = d3.mouse(this)
        if (new_lims_mousedown[0] != new_lims_mouseup[0] | new_lims_mousedown[1] != new_lims_mouseup[1]) {
            console.log(new_lims_mousedown,new_lims_mouseup);
        }
    });
}

function load_egg_database() {
    // get list of keys
    data_keys = Object.keys(egg_database[0]);
  
    // call the object named svg_dv, make it an svg with a given height
    egg_scatterplot_object = d3.select("#svg_div")
        .append("svg")
            // its name is egg_scatterplot
            .attr("class", "egg_scatterplot")
            .attr("width", egg_scatterplot_w)
            .attr("height", egg_scatterplot_h);

    // call the object named color_legend
    legend_object = d3.select("#color_legend")
        .append("svg")
        .attr("height","250")
        .attr("width","190")

    // make the scatterplot svg
    make_egg_scatterplot();
    make_legend();
    change_axes();
  
    // set up the autocomplete search bar
    for (let i=0; i<egg_database.length; i++) {
        for (let c=0; c<searchable_cols.length; c++) {
            let col = searchable_cols[c]; 
            let formatted_entry = egg_database[i][col].replace('_', ' ')
            searchable_set.add(formatted_entry);
            egg_database[i][col] = formatted_entry;
        }
    }
    var search_list = Array.from(searchable_set);
    var awesom_jnk = new Awesomplete(text_search, {list: search_list});
    text_search.addEventListener("awesomplete-selectcomplete", only_show_some);
    
}

function read_data() { 
    //read in explain data
    d3.tsv("data/dataviz_egg_database.csv", function(data1) {

        //Hand CSV data off to global var
        egg_database = data1;

        //Call some other functions
        load_egg_database(); 

    }); 
}