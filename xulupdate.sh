#!/bin/bash

# extract any file, just call `extract filename`
extract () {
    if [ -f $1 ] ; then
        case $1 in
            *.tar.bz2) tar xjf $1 ;;
            *.tar.gz) tar xzf $1 ;;
            *.bz2) bunzip2 $1 ;;
            *.rar) rar x $1 ;;
            *.gz) gunzip $1 ;;
            *.tar) tar xf $1 ;;
            *.tbz2) tar xjf $1 ;;
            *.tgz) tar xzf $1 ;;
            *.zip) unzip $1 ;;
            *.z) uncompress $1 ;;
            *) echo "unrecognized file extension: '$1'" ;;
        esac
    else
        echo "argument is not a file: '$1'"
    fi
}

#extract md5 sum
mdsum() {
    md5sum "$1"|awk '{print $1}'
}

#output error and die
err_exit() {
    echo "$1" >&2
    exit
}

#downloads all files to current working dir
download_version() {
    if [[ "x$1" == "x" ]]; then
        err_exit "Please specify the version to download"
        return
    fi
    
    #set variables and download urls
    version="$1"
    dl_root="http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/$version"
    urls=("$dl_root/runtimes/xulrunner-$version.en-US.linux-x86_64.tar.bz2" "$dl_root/runtimes/xulrunner-$version.en-US.linux-i686.tar.bz2" "$dl_root/runtimes/xulrunner-$version.en-US.win32.zip" "$dl_root/sdk/xulrunner-$version.en-US.mac-x86_64.sdk.tar.bz2" "$dl_root/sdk/xulrunner-$version.en-US.mac-i386.sdk.tar.bz2")
    
    #now we download them
    for url in ${urls[*]}
    do
        wget "$url"
    done
}
#creates md5s
create_pkg_md5() {
    if [[ "x$1" == "x" ]]; then
        err_exit "Please specify the version to use"
        return
    fi
    
    #set variables and download urls
    version="$1"
    if [[ "x$2" == "xtrue" ]]; then
        keep=true
    else
        keep=false
    fi
    dl_root="http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/$version"
    
    #all files, names, urls
    names=('"Linux_64bit"' '"Darwin_64bit"' '"Darwin_32bit"' '("Windows_32bit", "Windows_64bit")' '"Linux_32bit"')
    files=("xulrunner-$version.en-US.linux-x86_64.tar.bz2" "xulrunner-$version.en-US.mac-x86_64.sdk.tar.bz2" "xulrunner-$version.en-US.mac-i386.sdk.tar.bz2" "xulrunner-$version.en-US.win32.zip" "xulrunner-$version.en-US.linux-i686.tar.bz2")
    urlPrefixes=("runtime" "sdk" "sdk" "runtime" "runtime")
    exes=("xulrunner/xulrunner" "xulrunner-sdk/bin/xulrunner-bin" "xulrunner-sdk/bin/xulrunner-bin" "xulrunner/xulrunner.exe" "xulrunner/xulrunner")
    
    #output config file
    echo "software = {"
    
    #loop over all files
    for (( i=0; i<${#urlPrefixes[*]}; i++ ));
    do
        type="${names[$i]}"
        fname="${files[$i]}"
        url="$dl_root/${urlPrefixes[$i]}/$fname"
        exename="${exes[$i]}"
        
        #extract if not extracted
        echo "Extracting $type" >&2
        if [[ ! -d "$fname.dir" ]]
        then
            mkdir "$fname.dir"
            cd "$fname.dir"
            extract "../$fname" 1>&2 >/dev/null
        else
            cd "$fname.dir"
            echo "Using previous extraction..." >&2
        fi
        
        #mdsum
        echo "Calculating md5 sums" >&2
        md=$(mdsum "../$fname")
        mdexe=$(mdsum "$exename")
        
        #clean up
        cd ../
        if [[ $keep == false ]]
        then
            echo "Removing extraction" >&2
            rm -rf "$fname.dir"
        fi
        
        #output script
        if [[ $(($i + 1)) < ${#urlPrefixes[*]} ]];then
            coma=","
        else
            coma=""
        fi
        cat <<endl
    $type: {
       "url": "$url",
       "md5": "$md",
       "bin": {
           "path": "$exename",
           "sig": "$mdexe"
       }
    }$coma
endl
    
    done
    echo "}"
}

if [[ "x$1" == "x" ]]; then
    err_exit "Please specify the version to download. ex: '$0 10.0.2 [--keep]'"
fi

xulversion="$1"
dldirectory="xulrunner.$xulversion"

#have we run recently, and therfore the directory exists and has files in it?
if [[ -d "$dldirectory" && "$(ls -A "$dldirectory")" ]]; then

    #keep running until valid input
    invalid=true
    while [[ $invalid == true ]]; do
    
        read -p "'$dldirectory' has files in it. [D]elete, [a]rchive, or [u]se? " -n 1 result
        echo "" # new line
        case "$result" in
            #delete
            ""|d|D)
                rm -rf "$dldirectory"
                echo "Deleted!"
                
                mkdir "$dldirectory"
                invalid=false
                
                cd "$dldirectory"
                download_version "$xulversion"
                cd ../
                ;;
            #archive
            a|A)
                mv "$dldirectory" "$dldirectory.`date`"
                echo "Moved!"
                
                mkdir "$dldirectory"
                invalid=false
                
                cd "$dldirectory"
                download_version "$xulversion"
                cd ../
                ;;
            #use
            u|U)
                echo "Using..."
                invalid=false
                ;;
        esac
    done
else
    echo "No prior runs, downloading..." 
    [[ -d "$dldirectory" ]] || mkdir "$dldirectory" # make directory if not exist
    cd "$dldirectory"
    download_version "$xulversion"
    cd ../
fi

#check if we should keep files
keep=false
if [[ "x$2" == "x--keep" || "x$2" == "x-keep" || "x$2" == "x-k" || "x$2" == "xkeep" ]]; then
    keep=true
fi
outfile="$xulversion._config.py.head"

#generate md5's and save to $outfile
cd "$dldirectory"
create_pkg_md5 "$xulversion" $keep > "../$outfile"

echo "Wrote to $outfile"
#done!
